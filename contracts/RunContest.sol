//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract RunContest is Ownable {
    using SafeERC20 for IERC20;

    address public DATA;

    uint256 public entryFee;
    uint256 public minRunners;
    string public mode;
    string public description;

    uint256 public payoutFirst;
    uint256 public payoutSecond;
    uint256 public payoutThird;

    mapping(uint256 => address) public runnerPayers;
    uint256[] public runnerIds;

    uint256 public winnerFirst;
    uint256 public winnerSecond;
    uint256 public winnerThird;
    bool public winnersSet;

    uint256 public contestLengthDays;
    uint256 public startTimestamp;
    uint256 public endTimestamp;

    bool public canceled;
    bool public withdrawn;

    constructor(address _DATA, uint256 _contestLengthDays, uint256 _minRunners, uint256 _entryFee, uint256 _payoutFirst, uint256 _payoutSecond, uint256 _payoutThird, string memory _mode, string memory _description) Ownable() {
        require(_minRunners >= 3, 'must have at least three runners');
        require(_minRunners * _entryFee >= _payoutFirst + _payoutSecond + _payoutThird, 'must be enough DATA for payouts');
        DATA = _DATA;
        contestLengthDays = _contestLengthDays;
        minRunners = _minRunners;
        entryFee = _entryFee;
        payoutFirst = _payoutFirst;
        payoutSecond = _payoutSecond;
        payoutThird = _payoutThird;
        mode = _mode;
        description = _description;
    }

    function started() public view returns (bool) {
        return (startTimestamp != 0);
    }

    function numRunners() public view returns (uint) {
        return runnerIds.length;
    }

    function setDescription(string memory _description) public onlyOwner {
        require(!started(), 'cannot change description once contest starts');
        description = _description;
    }

    function registerRunner(uint256 runnerId) public {
        require(!canceled, 'cannot register for a canceled contest');
        require(startTimestamp == 0, 'can only register before the contest starts');
        require(runnerPayers[runnerId] == address(0), 'runner already registered');

        runnerPayers[runnerId] = msg.sender;
        runnerIds.push(runnerId);

        IERC20(DATA).safeTransferFrom(msg.sender, address(this), entryFee);
    }

    function startContest() public onlyOwner {
        require(!canceled, 'contest must not be canceled');
        require(startTimestamp == 0, 'already started');
        require(runnerIds.length >= minRunners, 'not enough runners have registered');
        startTimestamp = block.timestamp;
        endTimestamp = block.timestamp + (contestLengthDays * 1 days);
    }

    function endContest(uint256 first, uint256 second, uint256 third) public onlyOwner {
        require(startTimestamp != 0, 'contest must be started');
        require(endTimestamp < block.timestamp, 'contest must be over');
        require(!winnersSet, 'cannot end multiple times');
        require(runnerPayers[first] != address(0), 'winners must be registered');
        require(runnerPayers[second] != address(0), 'winners must be registered');
        require(runnerPayers[third] != address(0), 'winners must be registered');
        require(first != second, 'winners must be unique');
        require(first != third, 'winners must be unique');
        require(second != third, 'winners must be unique');

        winnerFirst = first;
        winnerSecond = second;
        winnerThird = third;
        winnersSet = true;
    }

    function collectWinnings(uint256 runnerId) public {
        require(winnersSet, 'cannot claim until the winners are set');
        require((runnerId == winnerFirst) || (runnerId == winnerSecond) || (runnerId == winnerThird), 'only winners can collect');
        require(runnerPayers[runnerId] != address(0), 'winnings already collected');

        uint256 amount;
        if (runnerId == winnerFirst) {
            amount = payoutFirst;
        } else if (runnerId == winnerSecond) {
            amount = payoutSecond;
        } else if (runnerId == winnerThird) {
            amount = payoutThird;
        }
        require(amount > 0, 'nothing to collect');

        address payer = runnerPayers[runnerId];
        delete runnerPayers[runnerId];

        IERC20(DATA).safeTransfer(payer, amount);
    }

    function withdraw() public onlyOwner {
        require(started(), 'not started');
        require(!withdrawn, 'already withdrawn');
        uint256 amount = (runnerIds.length * entryFee) - payoutFirst - payoutSecond - payoutThird;
        require(amount > 0, 'nothing to withdraw');

        withdrawn = true;

        IERC20(DATA).safeTransfer(msg.sender, amount);
    }

    function cancelContest() public onlyOwner {
        require(startTimestamp == 0, 'already started');
        canceled = true;
    }

    function processRefund(uint256 runnerId) public {
        require(canceled, 'refunds are only eligible when the contest is canceled');
        require(runnerPayers[runnerId] != address(0), 'this runner is ineligible for a refund');

        address payer = runnerPayers[runnerId];
        delete runnerPayers[runnerId];

        uint index = 0;
        for (index = 0; index < runnerIds.length; index++) {
            if (runnerId == runnerIds[index]) {
                break;
            }
        }
        runnerIds[index] = runnerIds[runnerIds.length - 1];
        runnerIds.pop();

        IERC20(DATA).safeTransfer(payer, entryFee);
    }
}
