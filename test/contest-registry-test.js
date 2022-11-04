const { expect } = require("chai");
const { ethers, waffle } = require("hardhat");

let contestRegistry;
beforeEach(async () => {
    contestRegistry = await ethers.getContractFactory('ContestRegistry').then(factory => factory.deploy());
    await contestRegistry.deployed();
});

describe('ContestRegistry', () => {
    it('should start empty', async () => {
        expect(await contestRegistry.numContests()).to.equal(0);
        await expect(contestRegistry.currentContest()).to.be.revertedWith('there are no contests');
    });

    it('should add one contest and become current', async () => {
        const addr1 = '0x0000000000000000000000000000000000000001';
        await contestRegistry.addContest(addr1);
        expect(await contestRegistry.numContests()).to.equal(1);
        expect(await contestRegistry.currentContest()).to.equal(addr1);
    });

    it('should make the latest contest the current one', async () => {
        const addr1 = '0x0000000000000000000000000000000000000001';
        const addr2 = '0x0000000000000000000000000000000000000002';
        await contestRegistry.addContest(addr1);
        await contestRegistry.addContest(addr2);
        expect(await contestRegistry.numContests()).to.equal(2);
        expect(await contestRegistry.currentContest()).to.equal(addr2);
    });

    it('should not allow you to register the same contest twice', async () => {
        const addr1 = '0x0000000000000000000000000000000000000001';
        await contestRegistry.addContest(addr1);
        await expect(contestRegistry.addContest(addr1)).to.be.revertedWith('contest already registered');
    });
});
