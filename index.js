const ethers = require("ethers");
const { expect } = require("chai");
const { getFunctionSignature, getEventTopic } = require("./util.js");
const provider = ethers.providers.getDefaultProvider("mainnet");
const proposal = require(`./proposalSpecs/${process.env.PROPOSAL}.json`);
console.log(JSON.stringify(proposal, null, 2));

const votingAppAddress = "0x05811ad31cbd5905e4e1427482713e3fb04a4c05";
const agentAppAddress = "0xe7af7c5982e073ac6525a34821fe1b3e8e432099";

// Constants
const forwardSignature = getFunctionSignature("forward(bytes)");
const executeSignature = getFunctionSignature("execute(address,uint256,bytes)");
const startVoteTopic = getEventTopic("StartVote(uint256,address,string)");

async function verifyProposal() {
  // Encode the proposal number
  const encodedProposalNo = ethers.utils.hexZeroPad(
    ethers.utils.hexValue(ethers.BigNumber.from(proposal.specs.proposalNo)),
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
  // Verify that the EVMScript targets the agent app
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
  expect(parameters1[0]).to.equal(proposal.specs.targetContractAddress);
  expect(
    parameters1[1].eq(ethers.BigNumber.from(proposal.specs.value))
  ).to.equal(true);
  const callData3 = parameters1[2];
  // ... and the third layer is peeled.

  const targetFunctionSignature = getFunctionSignature(
    proposal.specs.targetFunction
  );
  expect(ethers.utils.hexDataSlice(callData3, 0, 0x4)).to.equal(
    targetFunctionSignature
  );
  const targetFunctionArguments = proposal.specs.targetFunction
    .substring(
      proposal.specs.targetFunction.indexOf("(") + 1,
      proposal.specs.targetFunction.indexOf(")")
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
          proposal.specs.parameters[indParameter][indEntry]
        );
      }
    } else {
      expect(parameter.toString()).to.equal(
        proposal.specs.parameters[indParameter]
      );
    }
  }
  console.log(`Proposal #${process.env.PROPOSAL} is verified!`);
}

verifyProposal();
