const hre = require("hardhat");

const DATA_ADDRESS = '0x6874F20723BEFAd1745a0A16852eCdebCfd5D2EE';

function formatData(amount) {
    return hre.ethers.utils.parseUnits(String(amount), 18);
}
const fd = formatData;

// DATA, contestLengthDays, minRunners, entryFee, payoutFirst, payoutSecond, payoutThird, description
module.exports = {
    contests: [
        [
            DATA_ADDRESS,
            1,
            3,
            fd(300),
            fd(200),
            fd(150),
            fd(100),
            'total',
            `# Inaugural

For so long, we have waited for this. To get into the Grid and run against the corpos, to prove ourselves and to take what is ours.

Today, runners, is our day. Jack in and rack up that DATA!

## Most DATA wins!`
        ],
        [
            DATA_ADDRESS,
            2,
            5,
            fd(500),
            fd(1000),
            fd(600),
            fd(400),
            'best',
            `# another contest

Don't we all just _love_ hurting corpos?`
        ],
    ],
};
