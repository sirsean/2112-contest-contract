const hre = require("hardhat");
const fs = require('fs');
const constants = require('./constants.js');

async function main() {
    const registryAddress = fs.readFileSync(`deployed/${hre.network.name}.ContestRegistry`).toString();
    console.log('registry', registryAddress);
    const registryAbi = JSON.parse(fs.readFileSync('./abi/contracts/ContestRegistry.sol/ContestRegistry.json').toString());
    const registry = await hre.ethers.getContractAt(registryAbi, registryAddress, hre.ethers.provider.getSigner());

    const index = await registry.numContests().then(num => num.toNumber());
    console.log('contest', index);
    const deployArgs = constants.contests[index];
    console.log(deployArgs);
    if (!deployArgs) {
        throw `no deploy args for contest ${index}`;
    }
    const filename = `deployed/${hre.network.name}.RunContest.${index}`;
    const RunContest = await hre.ethers.getContractFactory('RunContest');
    const contest = await RunContest.deploy(...deployArgs);

    console.log('deployed RunContest to:', contest.address);
    await registry.addContest(contest.address);
    fs.writeFileSync(filename, contest.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
