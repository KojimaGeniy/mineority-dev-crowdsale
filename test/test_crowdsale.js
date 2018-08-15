const { assert } = require('chai');  
const Web3 = require('web3');
const { increaseTime } = require("./utils");
const web3 = new Web3(Web3.givenProvider);

const Crowdsale = artifacts.require("./Crowdsale")
const MultiSig = artifacts.require("./MultiSigEscrow")

contract('Crowdsale', function(accounts) {
  const [firstAccount, secondAccount,thirdAccount] = accounts;
  
  before(async () => {
    SaleInstance = await Crowdsale.new();
  });

  it("Creates project", async () => {
    await SaleInstance.createProject(1500,"0xd89a3fa2ddbed0a17fa2954b1060f41591c216155b688a7b5af5a2d7c003bb11",[secondAccount,thirdAccount],2,120);
    assert.notEqual((await SaleInstance.getProject.call(0))[0],0,"Project creation didn't go well");
    assert.isFalse(await SaleInstance.goalReached.call(0))
  });

  it("Funds the project", async () => {
    await SaleInstance.fundProject(0,{value: 800});
    await SaleInstance.fundProject(0,{value: 200});
    assert.equal(await SaleInstance.getBakerFunds(0,firstAccount),1000,"Funds not added to backer funded balance")
  });
  
  it("Makes the project successful", async () => {
    await SaleInstance.fundProject(0,{value: 500});
    assert.isTrue(await SaleInstance.goalReached.call(0),"Funds didn't reach the destination");
  });

  it("Fails to fund after expiration", async () => {
    increaseTime(121);
    try {
      await SaleInstance.fundProject(0,{value: 800});
      assert.fail();
    } catch (err) {
      assert.ok(/revert/.test(err.message));
    }
    assert.equal(await SaleInstance.getBakerFunds(0,firstAccount),1500,"Funds not added to backer funded balance")
  });
});

contract('MultiSig', function(accounts) {
  const [firstAccount, secondAccount,thirdAccount] = accounts;

  before(async () => {
    SaleInstance = await Crowdsale.new();
  });

  it("Creates project and checks for MultiSig", async () => {
    await SaleInstance.createProject(1500,"0xd89a3fa2ddbed0a17fa2954b1060f41591c216155b688a7b5af5a2d7c003bb11",[secondAccount,thirdAccount],2,4);
    MultiSigInstance = MultiSig.at((await SaleInstance.getProject.call(0))[3])
    assert.equal(await MultiSigInstance.required.call(),2)
    assert.notEqual((await SaleInstance.getProject.call(0))[3],0);    
  });

  it("Funds the project and forwards funds to MultiSig", async () => {
    await SaleInstance.fundProject(0,{value: 800});
    await SaleInstance.fundProject(0,{value: 200});
    assert.equal(await SaleInstance.getBakerFunds(0,firstAccount),1000,"Funds not added to backer funded balance")
    assert.equal(await MultiSigInstance.depositsOf(firstAccount),1000)
    assert.equal(await web3.eth.getBalance(MultiSigInstance.address),1000,"Not enough funds came")
  });

  it("Disallows owners to withdraw before finalization", async () => {
    try {  
      await MultiSigInstance.submitTransaction(accounts[4],1000,{from: secondAccount});
      assert.fail();
    } catch (err) {
      assert.ok(/revert/.test(err.message));
    }
  });

  it("Disallows bakers to refund before finalization", async () => {
    try {  
      await SaleInstance.claimRefund(0);
      assert.fail();
    } catch (err) {
      assert.ok(/revert/.test(err.message));
    }
  });

  it("Finalizes project, allows the owner to withdraw", async () => {
    await SaleInstance.fundProject(0,{value: 500});    
    await SaleInstance.finalize(0);
    let initialBalance = await web3.eth.getBalance(accounts[4])
    await MultiSigInstance.submitTransaction(accounts[4],1000,{from: secondAccount});
    await MultiSigInstance.confirmTransaction(0,{from: thirdAccount})
    assert.notEqual(initialBalance,await web3.eth.getBalance(accounts[4]),"Funds weren't withdrawn")
  });

  it("Disallows bakers to refund after successful finalization", async () => {
    try {  
      await SaleInstance.claimRefund(0);
      assert.fail();
    } catch (err) {
      assert.ok(/revert/.test(err.message));
    }
  });

  it("Allows bakers to refund after unsuccessful finalization", async () => {
    await SaleInstance.createProject(1500,"0xd89a3fa2ddbed0a17fa2954b1060f41591c216155b688a7b5af5a2d7c003bb11",[secondAccount,thirdAccount],2,4);
    await SaleInstance.fundProject(1,{from: secondAccount,value: 1400});
    await SaleInstance.finalize(1);
    assert.ok(await SaleInstance.claimRefund(1,{from: secondAccount}),"Refund didn't succeed");
  });

  it("Disallows owners to withdraw after unsuccessful finalization", async () => {
    MultiSigInstance = MultiSig.at((await SaleInstance.getProject.call(1))[3])    
    try {  
      await MultiSigInstance.submitTransaction(accounts[4],1000,{from: secondAccount});
      assert.fail();
    } catch (err) {
      assert.ok(/revert/.test(err.message));
    }
  })
})
