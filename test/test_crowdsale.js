const { assert } = require('chai');  
const Web3 = require('web3');
const web3 = new Web3(Web3.givenProvider);

const Crowdsale = artifacts.require("./Crowdsale")

contract('Crowdsale', function(accounts) {
  const [firstAccount, secondAccount,thirdAccount] = accounts;
  
  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  before(async () => {
    SaleInstance = await Crowdsale.new();
  });

  it("Creates project", async () => {
    await SaleInstance.createProject(1500,"Sanyok",secondAccount,5);
    console.log("S -",(await SaleInstance.getProject.call(0))[2])
    assert.notEqual((await SaleInstance.getProject.call(0))[0],0);
    assert.isFalse(await SaleInstance.goalReached.call(0))
  });

  it("Funds the project", async () => {
    await SaleInstance.fundProject(0,{value: 800});
    await SaleInstance.fundProject(0,{value: 200});
    assert.equal(await SaleInstance.getBakerFunds(0,firstAccount),1000,"Funds not added to backer funded balance")
  });
  
  it("Makes the project successful", async () => {
    await SaleInstance.fundProject(0,{value: 500});
    assert.isTrue(await SaleInstance.goalReached.call(0),"Somebody stole the funds fucking government");
  });

  it("Fails to fund after expiration", async () => {
    await sleep(6000);
    try {
      await SaleInstance.fundProject(0,{value: 800});
      assert.fail();
    } catch (err) {
      assert.ok(/revert/.test(err.message));
    }
    assert.equal(await SaleInstance.getBakerFunds(0,firstAccount),1500,"Funds not added to backer funded balance")
  });





  // it("Fails to create service because of not approved", async () => {
  //   await TokenInstance.mint(firstAccount,10);
  //   await TokenInstance.approve(CoreInstance.address,3);
  //   try {
  //     await CoreInstance.createService(1,1,thirdAccount,5);
  //     assert.fail();
  //   } catch (err) {
  //     assert.ok(/revert/.test(err.message));
  //   }
  // });

});
