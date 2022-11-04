const hre = require("hardhat");
const fs = require('fs');
const constants = require('./constants.js');

async function main() {
    const filename = `deployed/${hre.network.name}.ContestRegistry`;

    const ContestRegistry = await hre.ethers.getContractFactory('ContestRegistry');
    const registry = await ContestRegistry.deploy();

    console.log('deployed ContestRegistry to:', registry.address);
    fs.writeFileSync(filename, registry.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
