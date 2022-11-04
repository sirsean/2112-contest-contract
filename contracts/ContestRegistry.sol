//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract ContestRegistry is Ownable {
    address[] public contests;
    mapping(address => bool) registered;

    constructor() Ownable() {
    }

    function addContest(address contest) public onlyOwner {
        require(!registered[contest], 'contest already registered');
        contests.push(contest);
        registered[contest] = true;
    }

    function numContests() public view returns (uint256) {
        return contests.length;
    }

    function currentContest() public view returns (address) {
        require(contests.length > 0, 'there are no contests');
        return contests[contests.length - 1];
    }
}
