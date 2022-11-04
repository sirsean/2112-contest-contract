const { expect } = require("chai");
const { ethers, waffle } = require("hardhat");

const IERC20_SOURCE = '@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20';
const DATA_ADDRESS = '0x6874F20723BEFAd1745a0A16852eCdebCfd5D2EE';
const DATA_WHALE = '0x560EBafD8dB62cbdB44B50539d65b48072b98277';

let owner, whale;
let contract, dataContract;
beforeEach(async () => {
    [owner] = await ethers.getSigners();
    await network.provider.request({
        method: 'hardhat_impersonateAccount',
        params: [DATA_WHALE],
    });
    whale = ethers.provider.getSigner(DATA_WHALE);
    dataContract = await ethers.getContractAt(IERC20_SOURCE, DATA_ADDRESS, whale);
    const deployArgs = [
        DATA_ADDRESS,
        10,
        3,
        1000,
        100,
        50,
        25,
        'total',
        'this is a great contest',
    ];
    contract = await ethers.getContractFactory('RunContest').then(f => f.deploy(...deployArgs));
    await contract.deployed();
});

describe('constructor', async () => {
    it('must have enough runners', async () => {
        const deployArgs = [
            DATA_ADDRESS,
            10,
            2,
            500,
            100,
            50,
            25,
            'total',
            'this is a great contest',
        ];
        const f = await ethers.getContractFactory('RunContest');
        await expect(f.deploy(...deployArgs)).to.be.revertedWith('must have at least three runners');
    });

    it('must have enough DATA for all payouts', async () => {
        const deployArgs = [
            DATA_ADDRESS,
            10,
            3,
            50,
            100,
            50,
            25,
            'total',
            'this is a great contest',
        ];
        const f = await ethers.getContractFactory('RunContest');
        await expect(f.deploy(...deployArgs)).to.be.revertedWith('must be enough DATA for payouts');
    });
});

describe('basics', async () => {
    it('sets all the constructor args', async () => {
        expect(await contract.DATA()).to.equal(DATA_ADDRESS);
        expect(await contract.contestLengthDays()).to.equal(10);
        expect(await contract.minRunners()).to.equal(3);
        expect(await contract.entryFee()).to.equal(1000);
        expect(await contract.payoutFirst()).to.equal(100);
        expect(await contract.payoutSecond()).to.equal(50);
        expect(await contract.payoutThird()).to.equal(25);
        expect(await contract.mode()).to.equal('total');
        expect(await contract.description()).to.equal('this is a great contest');
    });

    it('can set the description', async () => {
        await contract.setDescription('even better now');
        expect(await contract.description()).to.equal('even better now');
    });

    it('is not started', async () => {
        expect(await contract.started()).to.equal(false);
    });

    it('is not canceled', async () => {
        expect(await contract.canceled()).to.equal(false);
    });

    it('is not withdrawn', async () => {
        expect(await contract.withdrawn()).to.equal(false);
    });
});

describe('registration', async () => {
    it('starts with no registered runners', async () => {
        expect(await contract.numRunners()).to.equal(0);
    });

    it('can register a runner', async () => {
        await dataContract.connect(whale).approve(contract.address, 1000);
        await contract.connect(whale).registerRunner(1);
        expect(await contract.numRunners()).to.equal(1);
    });

    it('transfers the entry fee', async () => {
        const whaleBefore = await dataContract.balanceOf(DATA_WHALE);
        const contestBefore = await dataContract.balanceOf(contract.address);
        await dataContract.connect(whale).approve(contract.address, 1000);
        await contract.connect(whale).registerRunner(1);
        const whaleAfter = await dataContract.balanceOf(DATA_WHALE);
        const contestAfter = await dataContract.balanceOf(contract.address);
        expect(whaleAfter).to.equal(whaleBefore.sub(1000));
        expect(contestAfter).to.equal(contestBefore.add(1000));
        expect(contestAfter).to.equal(1000);
    });

    it('cannot register the same runner twice', async () => {
        await dataContract.connect(whale).approve(contract.address, 2000);
        await contract.connect(whale).registerRunner(1);
        await expect(contract.connect(whale).registerRunner(1)).to.be.revertedWith('runner already registered');
    });

    it('can register a second runner', async () => {
        await dataContract.connect(whale).approve(contract.address, 2000);
        await contract.connect(whale).registerRunner(1);
        await contract.connect(whale).registerRunner(2);
        expect(await contract.numRunners()).to.equal(2);
    });
});

describe('starting the contest', async () => {
    it('cannot start without enough runners', async () => {
        await expect(contract.startContest()).to.be.revertedWith('not enough runners have registered');
    });

    it('cannot start if it has been canceled', async () => {
        await contract.cancelContest();
        await expect(contract.startContest()).to.be.revertedWith('contest must not be canceled');
    });

    it('cannot start twice', async () => {
        await dataContract.connect(whale).approve(contract.address, 3000);
        await contract.connect(whale).registerRunner(1);
        await contract.connect(whale).registerRunner(2);
        await contract.connect(whale).registerRunner(3);
        await contract.startContest();
        await expect(contract.startContest()).to.be.revertedWith('already started');
    });

    it('cannot be canceled after it starts', async () => {
        await dataContract.connect(whale).approve(contract.address, 3000);
        await contract.connect(whale).registerRunner(1);
        await contract.connect(whale).registerRunner(2);
        await contract.connect(whale).registerRunner(3);
        await contract.startContest();
        await expect(contract.cancelContest()).to.be.revertedWith('already started');
    });

    it('once it starts, the start/end timestamps are known', async () => {
        await dataContract.connect(whale).approve(contract.address, 3000);
        await contract.connect(whale).registerRunner(1);
        await contract.connect(whale).registerRunner(2);
        await contract.connect(whale).registerRunner(3);
        await contract.startContest();
        expect(await contract.started()).to.equal(true);
        await Promise.all([
            owner.provider.getBlock().then(b => b.timestamp),
            contract.startTimestamp(),
            contract.endTimestamp(),
        ]).then(([ now, start, end ]) => {
            expect(parseInt(start)).to.equal(now);
            expect(parseInt(end)).to.equal(now + 10*24*3600);
        });
    });
});

describe('withdrawing', async () => {
    it('cannot withdraw before it starts', async () => {
        await expect(contract.withdraw()).to.be.revertedWith('not started');
    });

    it('cannot withdraw if it is canceled', async () => {
        await contract.cancelContest();
        await expect(contract.withdraw()).to.be.revertedWith('not started');
    });

    it('cannot withdraw twice', async () => {
        await dataContract.connect(whale).approve(contract.address, 3000);
        await contract.connect(whale).registerRunner(1);
        await contract.connect(whale).registerRunner(2);
        await contract.connect(whale).registerRunner(3);
        await contract.startContest();
        await contract.withdraw();
        await expect(contract.withdraw()).to.be.revertedWith('already withdrawn');
    });

    it('withdraws entry fees minus payout amounts', async () => {
        const balanceBefore = await dataContract.balanceOf(owner.address);
        await dataContract.connect(whale).approve(contract.address, 3000);
        await contract.connect(whale).registerRunner(1);
        await contract.connect(whale).registerRunner(2);
        await contract.connect(whale).registerRunner(3);
        await contract.startContest();
        await contract.withdraw();
        const balanceAfter = await dataContract.balanceOf(owner.address);
        expect(balanceAfter).to.equal(balanceBefore.add(3000 - 175));
    });
});

describe('ending', async () => {
    it('cannot end if it is not started', async () => {
        await expect(contract.endContest(1, 2, 3)).to.be.revertedWith('contest must be started');
    });

    it('cannot end before the endTimestamp', async () => {
        await dataContract.connect(whale).approve(contract.address, 3000);
        await contract.connect(whale).registerRunner(1);
        await contract.connect(whale).registerRunner(2);
        await contract.connect(whale).registerRunner(3);
        await contract.startContest();
        await expect(contract.endContest(1, 2, 3)).to.be.revertedWith('contest must be over');
    });

    it('cannot win if you did not enter', async () => {
        await dataContract.connect(whale).approve(contract.address, 3000);
        await contract.connect(whale).registerRunner(1);
        await contract.connect(whale).registerRunner(2);
        await contract.connect(whale).registerRunner(3);
        await contract.startContest();
        await ethers.provider.send('evm_increaseTime', [10*24*3600+1]);
        await ethers.provider.send('evm_mine');
        await expect(contract.endContest(1, 2, 4)).to.be.revertedWith('winners must be registered');
        await expect(contract.endContest(1, 4, 3)).to.be.revertedWith('winners must be registered');
        await expect(contract.endContest(4, 2, 3)).to.be.revertedWith('winners must be registered');
    });

    it('sets the winning runners', async () => {
        await dataContract.connect(whale).approve(contract.address, 3000);
        await contract.connect(whale).registerRunner(1);
        await contract.connect(whale).registerRunner(2);
        await contract.connect(whale).registerRunner(3);
        await contract.startContest();
        await ethers.provider.send('evm_increaseTime', [10*24*3600+1]);
        await ethers.provider.send('evm_mine');
        await contract.endContest(1, 2, 3);
        expect(await contract.winnerFirst()).to.equal(1);
        expect(await contract.winnerSecond()).to.equal(2);
        expect(await contract.winnerThird()).to.equal(3);
    });

    it('winners can collect their winnings', async () => {
        await dataContract.connect(whale).approve(contract.address, 3000);
        await contract.connect(whale).registerRunner(1);
        await contract.connect(whale).registerRunner(2);
        await contract.connect(whale).registerRunner(3);
        await contract.startContest();
        await ethers.provider.send('evm_increaseTime', [10*24*3600+1]);
        await ethers.provider.send('evm_mine');
        await contract.endContest(1, 2, 3);

        const startBalance = await dataContract.balanceOf(DATA_WHALE);
        await contract.collectWinnings(1);
        const firstWinBalance = await dataContract.balanceOf(DATA_WHALE);
        expect(firstWinBalance).to.equal(startBalance.add(100));
        await contract.collectWinnings(2);
        const secondWinBalance = await dataContract.balanceOf(DATA_WHALE);
        expect(secondWinBalance).to.equal(firstWinBalance.add(50));
        await contract.collectWinnings(3);
        const thirdWinBalance = await dataContract.balanceOf(DATA_WHALE);
        expect(thirdWinBalance).to.equal(secondWinBalance.add(25));
    });

    it('cannot claim runner zero before the end', async () => {
        await dataContract.connect(whale).approve(contract.address, 4000);
        await contract.connect(whale).registerRunner(1);
        await contract.connect(whale).registerRunner(2);
        await contract.connect(whale).registerRunner(3);
        await contract.connect(whale).registerRunner(0);
        await contract.startContest();
        await expect(contract.collectWinnings(0)).to.be.revertedWith('cannot claim until the winners are set');
    });

    it('cannot collect if you did not win', async () => {
        await dataContract.connect(whale).approve(contract.address, 3000);
        await contract.connect(whale).registerRunner(1);
        await contract.connect(whale).registerRunner(2);
        await contract.connect(whale).registerRunner(3);
        await contract.startContest();
        await ethers.provider.send('evm_increaseTime', [10*24*3600+1]);
        await ethers.provider.send('evm_mine');
        await contract.endContest(1, 2, 3);

        await expect(contract.collectWinnings(4)).to.be.revertedWith('only winners can collect');
    });

    it('winners cannot collect multiple times', async () => {
        await dataContract.connect(whale).approve(contract.address, 3000);
        await contract.connect(whale).registerRunner(1);
        await contract.connect(whale).registerRunner(2);
        await contract.connect(whale).registerRunner(3);
        await contract.startContest();
        await ethers.provider.send('evm_increaseTime', [10*24*3600+1]);
        await ethers.provider.send('evm_mine');
        await contract.endContest(1, 2, 3);

        await contract.collectWinnings(1);
        await expect(contract.collectWinnings(1)).to.be.revertedWith('winnings already collected');
    });

    it('cannot collect before it ends', async () => {
        await dataContract.connect(whale).approve(contract.address, 3000);
        await contract.connect(whale).registerRunner(1);
        await contract.connect(whale).registerRunner(2);
        await contract.connect(whale).registerRunner(3);
        await contract.startContest();
        await ethers.provider.send('evm_increaseTime', [10*24*3600+1]);
        await ethers.provider.send('evm_mine');

        await expect(contract.collectWinnings(1)).to.be.revertedWith('cannot claim until the winners are set');
    });
});

describe('cancellation', async () => {
    it('cannot refund if not canceled', async () => {
        await dataContract.connect(whale).approve(contract.address, 3000);
        await contract.connect(whale).registerRunner(1);
        await contract.connect(whale).registerRunner(2);
        await contract.connect(whale).registerRunner(3);

        await expect(contract.processRefund(1)).to.be.revertedWith('refunds are only eligible when the contest is canceled');
    });

    it('cannot register after cancellation', async () => {
        await contract.cancelContest();
        await dataContract.connect(whale).approve(contract.address, 3000);
        await expect(contract.connect(whale).registerRunner(1)).to.be.revertedWith('cannot register for a canceled contest');
    });

    it('can refund after cancellation', async () => {
        await dataContract.connect(whale).approve(contract.address, 3000);
        await contract.connect(whale).registerRunner(1);
        await contract.connect(whale).registerRunner(2);
        await contract.connect(whale).registerRunner(3);
        contract.cancelContest();

        const balance1 = await dataContract.balanceOf(DATA_WHALE);
        await contract.processRefund(1);
        const balance2 = await dataContract.balanceOf(DATA_WHALE);
        expect(balance2).to.equal(balance1.add(1000));
    });

    it('cannot refund twice', async () => {
        await dataContract.connect(whale).approve(contract.address, 3000);
        await contract.connect(whale).registerRunner(1);
        await contract.connect(whale).registerRunner(2);
        await contract.connect(whale).registerRunner(3);
        await contract.cancelContest();
        await contract.processRefund(1);
        await expect(contract.processRefund(1)).to.be.revertedWith('this runner is ineligible for a refund');
    });

    it('cannot refund if you did not register', async () => {
        await contract.cancelContest();
        await expect(contract.processRefund(1)).to.be.revertedWith('this runner is ineligible for a refund');
    });
});
