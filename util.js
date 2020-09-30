const ethers = require("ethers");

module.exports = {
  getFunctionSignature: function (functionFragment) {
    return ethers.utils.hexDataSlice(
      ethers.utils.keccak256(ethers.utils.toUtf8Bytes(functionFragment)),
      0,
      4
    );
  },
  getEventTopic: function (eventFragment) {
    return ethers.utils.keccak256(ethers.utils.toUtf8Bytes(eventFragment));
  },
};
