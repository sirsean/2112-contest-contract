const fs = require('fs');
const os = require('os');
const path = require('path');
require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-etherscan");
require('hardhat-abi-exporter');

const configPath = path.join(os.homedir(), '.wallet');
if (!fs.existsSync(configPath)) {
    console.log('config file missing, please place it at:', configPath);
    process.exit();
}
const config = JSON.parse(fs.readFileSync(configPath));

const DATA_ADDRESS = '0x6874F20723BEFAd1745a0A16852eCdebCfd5D2EE';

const contestAbi = JSON.parse(fs.readFileSync('./abi/contracts/RunContest.sol/RunContest.json').toString())
const registryAbi = JSON.parse(fs.readFileSync('./abi/contracts/ContestRegistry.sol/ContestRegistry.json').toString());
const erc20Abi = JSON.parse(fs.readFileSync('./abi/@openzeppelin/contracts/token/ERC20/IERC20.sol/IERC20.json').toString());

task('balance', 'Prints an account balance')
    .addParam('account', 'the account address')
    .setAction(async ({ account }, hre) => {
        console.log('get balance for account', account);
        await hre.ethers.provider.getBalance(account)
            .then(b => hre.ethers.utils.formatEther(b, 'ether'))
            .then(console.log);
    });

task('dataBalance', 'Prints an account DATA balance')
    .addParam('account', 'the account address')
    .setAction(async ({ account }, hre) => {
        console.log('get DATA balance for account', account);
        const dataAbi = JSON.parse(fs.readFileSync('./abi/@openzeppelin/contracts/token/ERC20/IERC20.sol/IERC20.json').toString());
        await hre.ethers.getContractAt(dataAbi, DATA_ADDRESS, hre.ethers.provider)
            .then(contract => contract.balanceOf(account))
            .then(b => hre.ethers.utils.formatEther(b, 'ether'))
            .then(console.log);
    });

task('getOwner', 'prints the owner of the registry')
    .addParam('registry', 'the registry address')
    .setAction(async ({ registry }, hre) => {
        await hre.ethers.getContractAt(registryAbi, registry, hre.ethers.provider).then(contract => {
            return contract.owner();
        }).then(owner => {
            console.log(owner);
        });
    });

task('numContests', 'Prints the number of contests in a registry')
    .addParam('registry', 'the registry address')
    .setAction(async ({ registry }, hre) => {
        await hre.ethers.getContractAt(registryAbi, registry, hre.ethers.provider).then(contract => {
            return contract.numContests();
        }).then(num => {
            console.log('contests:', num.toNumber());
        });
    });

task('cancel', 'Cancel a contest')
    .addParam('contest', 'the contest address')
    .setAction(async ({ contest }, hre) => {
        await hre.ethers.getContractAt(contestAbi, contest, hre.ethers.provider.getSigner()).then(contract => {
            return contract.cancelContest();
        }).then(tx => tx.wait()).then(() => {
            console.log('canceled');
        });
    });

task('register', 'Register a runner for a contest')
    .addParam('contest', 'the contest address')
    .addParam('runner', 'the runner id')
    .setAction(async ({ contest, runner }, hre) => {
        const dataContract = await hre.ethers.getContractAt(erc20Abi, DATA_ADDRESS, hre.ethers.provider.getSigner());
        const contestContract = await hre.ethers.getContractAt(contestAbi, contest, hre.ethers.provider.getSigner());
        return contestContract.entryFee().then(entryFee => {
            return dataContract.approve(contest, entryFee);
        }).then(tx => tx.wait()).then(() => {
            return contestContract.registerRunner(runner);
        }).then(tx => tx.wait()).then(() => {
            console.log('registered', runner);
        });
    });

task('refund', 'Refund a runner for a canceled contest')
    .addParam('contest', 'the contest address')
    .addParam('runner', 'the runner id')
    .setAction(async ({ contest, runner }, hre) => {
        const contestContract = await hre.ethers.getContractAt(contestAbi, contest, hre.ethers.provider.getSigner());
        return contestContract.processRefund(runner)
            .then(tx => tx.wait())
            .then(() => {
                console.log('refunded', runner);
            });
    });

task('start', 'Start a contest')
    .addParam('contest', 'the contest address')
    .setAction(async ({ contest }, hre) => {
        const contestContract = await hre.ethers.getContractAt(contestAbi, contest, hre.ethers.provider.getSigner());
        return contestContract.startContest()
            .then(tx => tx.wait())
            .then(() => {
                console.log('started', contest);
            });
    });

task('end', 'Start a contest')
    .addParam('contest', 'the contest address')
    .addParam('first', 'the first place runner id')
    .addParam('second', 'the second place runner id')
    .addParam('third', 'the third place runner id')
    .setAction(async ({ contest, first, second, third }, hre) => {
        const contestContract = await hre.ethers.getContractAt(contestAbi, contest, hre.ethers.provider.getSigner());
        return hre.ethers.provider.getFeeData().then(feeData => {
            const opts = {
                gasPrice: feeData.gasPrice.mul(2),
            };
            return contestContract.endContest(first, second, third, opts);
        }).then(tx => tx.wait())
            .then(() => {
                console.log('ended', contest);
            });
    });

task('withdraw', 'Withdraw the DATA from a contest')
    .addParam('contest', 'the contest address')
    .setAction(async ({ contest }, hre) => {
        const contestContract = await hre.ethers.getContractAt(contestAbi, contest, hre.ethers.provider.getSigner());
        return contestContract.withdraw()
            .then(tx => tx.wait())
            .then(() => {
                console.log('withdrew', contest);
            });
    });

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
    networks: {
        hardhat: {
            mining: {
                auto: true,
            },
            forking: {
                url: config.polygon,
                accounts: [config.key],
            },
        },
        polygon: {
            url: config.polygon,
            accounts: [config.key],
        },
    },
    solidity: {
        version: "0.8.17",
        settings: {
            optimizer: {
                enabled: true,
                runs: 200,
            },
        },
    },
    abiExporter: {
        runOnCompile: true,
        clear: true,
    },
    etherscan: {
        apiKey: {
            polygon: config.polygonscan_key,
        },
    },
};
