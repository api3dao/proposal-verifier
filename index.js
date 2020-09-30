const ethers = require("ethers");
const { expect } = require("chai");
const { getFunctionSignature, getEventTopic } = require("./util.js");
const provider = ethers.providers.getDefaultProvider("rinkeby");
const proposalSpecs = require(`./proposalSpecs/${process.env.PROPOSAL}.json`);
console.log(proposalSpecs);

// TODO: Update with mainnet addresses
// DAO-specific parameters
const votingAppAddress = "0x30af083b062bdf4d0bf067d28bd39091c7dd7af0";
const agentAppAddress = "0x0c26bb185ad09c5a41e8fd127bf7b8c99e81e5dc";

// Constants
const forwardSignature = getFunctionSignature("forward(bytes)");
const executeSignature = getFunctionSignature("execute(address,uint256,bytes)");
const startVoteTopic = getEventTopic("StartVote(uint256,address,string)");

async function verifyProposal() {
  // Encode the proposal number
  const encodedProposalNo = ethers.utils.hexZeroPad(
    ethers.utils.hexValue(ethers.BigNumber.from(proposalSpecs.proposalNo)),
    32
  );
  // Find the respective log
  const votingLog = (
    await provider.getLogs({
      address: votingAppAddress,
      fromBlock: 0,
      toBlock: "latest",
      topics: [startVoteTopic, encodedProposalNo],
    })
  )[0];

  // Get the transaction where this log was emitted
  const tx = await provider.getTransaction(votingLog.transactionHash);
  // The first signature should belong to forward()
  expect(ethers.utils.hexDataSlice(tx.data, 0, 0x4)).to.equal(forwardSignature);
  // Get rid of the signature and decode the rest
  const evmScript1 = ethers.utils.defaultAbiCoder.decode(
    ["bytes"],
    ethers.utils.hexDataSlice(tx.data, 4)
  )[0];
  // We get an EVMScript here. See the link below for specifications
  // // https://github.com/aragon/aragonOS/blob/c85d34e4bae0bf5b1ab78340b32e712d895179a7/contracts/evmscript/executors/CallsScript.sol#L33
  // Verify the EVMScript spec ID
  expect(ethers.utils.hexDataSlice(evmScript1, 0, 0x4)).to.equal("0x00000001");
  // Verify that the EVMScript targets the voting app
  expect(ethers.utils.hexDataSlice(evmScript1, 0x4, 0x4 + 0x14)).to.equal(
    votingAppAddress
  );
  const callDataLength1 = ethers.utils.hexDataSlice(
    evmScript1,
    0x4 + 0x14,
    0x4 + 0x14 + 0x4
  );
  const callData1 = ethers.utils.hexDataSlice(
    evmScript1,
    0x4 + 0x14 + 0x4,
    0x4 + 0x14 + 0x4 + parseInt(callDataLength1)
  );
  // ... and the first layer is peeled.

  // The second signature should belong to forward()
  expect(ethers.utils.hexDataSlice(callData1, 0, 0x4)).to.equal(
    forwardSignature
  );
  // Get rid of the signature and decode the rest
  const evmScript2 = ethers.utils.defaultAbiCoder.decode(
    ["bytes"],
    ethers.utils.hexDataSlice(callData1, 4)
  )[0];
  // Verify the EVMScript spec ID
  expect(ethers.utils.hexDataSlice(evmScript2, 0, 0x4)).to.equal("0x00000001");
  // Verify that the EVMScript targets the voting app
  expect(ethers.utils.hexDataSlice(evmScript2, 0x4, 0x4 + 0x14)).to.equal(
    agentAppAddress
  );
  const callDataLength2 = ethers.utils.hexDataSlice(
    evmScript2,
    0x4 + 0x14,
    0x4 + 0x14 + 0x4
  );
  const callData2 = ethers.utils.hexDataSlice(
    evmScript2,
    0x4 + 0x14 + 0x4,
    0x4 + 0x14 + 0x4 + parseInt(callDataLength2)
  );
  // ... and the second layer is peeled.

  // The third signature should belong to execute()
  expect(ethers.utils.hexDataSlice(callData2, 0, 0x4)).to.equal(
    executeSignature
  );
  const parameters1 = ethers.utils.defaultAbiCoder.decode(
    ["address", "uint256", "bytes"],
    ethers.utils.hexDataSlice(callData2, 4)
  );
  expect(parameters1[0]).to.equal(proposalSpecs.targetContractAddress);
  expect(
    parameters1[1].eq(ethers.BigNumber.from(proposalSpecs.value))
  ).to.equal(true);
  const callData3 = parameters1[2];
  // ... and the third layer is peeled.

  const targetFunctionSignature = getFunctionSignature(
    proposalSpecs.targetFunction
  );
  expect(ethers.utils.hexDataSlice(callData3, 0, 0x4)).to.equal(
    targetFunctionSignature
  );
  const targetFunctionArguments = proposalSpecs.targetFunction
    .substring(
      proposalSpecs.targetFunction.indexOf("(") + 1,
      proposalSpecs.targetFunction.indexOf(")")
    )
    .split(",");
  const parameters2 = ethers.utils.defaultAbiCoder.decode(
    targetFunctionArguments,
    ethers.utils.hexDataSlice(callData3, 4)
  );
  for (const [indParameter, parameter] of parameters2.entries()) {
    if (Array.isArray(parameter)) {
      for (const [indEntry, entry] of parameter.entries()) {
        expect(entry.toString()).to.equal(
          proposalSpecs.parameters[indParameter][indEntry]
        );
      }
    } else {
      expect(parameter.toString()).to.equal(
        proposalSpecs.parameters[indParameter]
      );
    }
  }
  console.log(`Proposal #${process.env.PROPOSAL} is verified!`);
}

verifyProposal();
