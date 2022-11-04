const hre = require("hardhat");

module.exports = {
    DATA_ADDRESS: '0x6874F20723BEFAd1745a0A16852eCdebCfd5D2EE',
    formatData: function(amount) {
        return hre.ethers.utils.parseUnits(String(amount), 18);
    },
};
