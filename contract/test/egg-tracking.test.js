'use strict';
const sinon = require('sinon');
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const sinonChai = require('sinon-chai');
const expect = chai.expect;

const { Context } = require('fabric-contract-api');
const { ChaincodeStub, ClientIdentity } = require('fabric-shim');

const EggTrackingContract = require('../lib/egg-tracking-contract.js');

let assert = sinon.assert;
chai.use(sinonChai);
chai.use(chaiAsPromised);

// This class is used to "mimic" a iterable query result from the HLF world state database
class MockIterator {
    constructor(data) {
        this.array = data;
        this.cur = 0;
    }
    next() {
        if (this.cur < this.array.length) {
            const value = this.array[this.cur];
            this.cur++;
            return Promise.resolve({ value: value });
        } else {
            return Promise.resolve({ done: true });
        }
    }
    close() {
        return Promise.resolve();
    }
}

describe('EggTrackingContract Basic Tests', () => {
    let transactionContext;
    let chaincodeStub;
    let mockClientIdentity;

    beforeEach(() => {
        // Creating a transaction context
        transactionContext = new Context();

        // Creating a mock representation of the chaincode stub
        chaincodeStub = sinon.createStubInstance(ChaincodeStub);
        
        // Injecting the stub into the context
        transactionContext.setChaincodeStub(chaincodeStub);

        // Creating a mock identity
        mockClientIdentity = sinon.createStubInstance(ClientIdentity);

        // Injecting the identity into the transaction context
        transactionContext.clientIdentity = mockClientIdentity;

        // Emulate typical functions to change and query the state
        chaincodeStub.putState.callsFake((key, value) => {
            if (!chaincodeStub.states) {
                chaincodeStub.states = {};
            }
            chaincodeStub.states[key] = value;
        });

        chaincodeStub.getState.callsFake(async (key) => {
            let ret;
            if (chaincodeStub.states) {
                ret = chaincodeStub.states[key];
            }
            return Promise.resolve(ret);
        });

        chaincodeStub.deleteState.callsFake(async (key) => {
            if (chaincodeStub.states) {
                delete chaincodeStub.states[key];
            }
            return Promise.resolve(key);
        });

        chaincodeStub.getStateByRange.callsFake(async () => {
            function* internalGetStateByRange() {
                if (chaincodeStub.states) {
                    // Shallow copy
                    const copied = Object.assign({}, chaincodeStub.states);

                    for (let key in copied) {
                        yield {value: copied[key]};
                    }
                }
            }

            return Promise.resolve(internalGetStateByRange());
        });

        // Used to get results of a custom query: note that this is a simple solution returning all elements in the state database
        // if you want to "mimic" your expected results, you should filter out them manually
        chaincodeStub.getQueryResult.callsFake(async () => {
            if (chaincodeStub.states) {
                let mockResponse = [];

                for (let stateKey in chaincodeStub.states) {
                    mockResponse.push({ key: stateKey, value: chaincodeStub.states[stateKey]});
                }
                return new MockIterator(mockResponse);

            } else {
                return null;
            }
        });

    });

    describe('Test CreateEggBox', () => {

        it('should return success on packEggs', async () => {

            mockClientIdentity.assertAttributeValue.returns('Farmer');

            const eggTrackingContract = new EggTrackingContract();

            const result = await eggTrackingContract.packEggs(transactionContext, 'farmer1','202106031608',30);

            const resultObj = JSON.parse(result);

            expect(resultObj.originId).to.eql('farmer1');
            expect(resultObj.packingTimestamp).to.eql('202106031608');
            expect(resultObj.quantity).to.eql(30);
            expect(resultObj.holderId).to.eql('farmer1');
            expect(resultObj.currentState).to.eql('PACKED');
            expect(resultObj.eggBoxId).to.eq('EggBox:farmer1:202106031608');
        });

        it('should not allow duplicated packs', async() => {
            mockClientIdentity.assertAttributeValue.returns(true);

            // Pack product for the first time
            const eggTrackingContract = new EggTrackingContract();

            // call the contract function
            await eggTrackingContract.packEggs(transactionContext, 'farmer1','202106031608',30);

            // call it again with the same values
            await expect(eggTrackingContract.packEggs(transactionContext, 'farmer1','202106031608',30))
                .to.be.rejectedWith(Error,'Egg box with key EggBox:farmer1:202106031608 already exists');

        });

        it('should not allow packing eggs for non-farmers and non-admins', async() => {
            mockClientIdentity.assertAttributeValue.returns(false);
            mockClientIdentity.getID.returns('shipper');

            // Pack product for the first time
            const eggTrackingContract = new EggTrackingContract();

            // call the contract function
            await expect(eggTrackingContract.packEggs(transactionContext, 'farmer1','202106031609',30)).to.be.rejectedWith(Error,'Egg boxes can only be packed by farmers or administrators');

        });

    });

    describe('Test shipment', async() => {
        it('should create a shipment with success', async() => {

            // The client is allowed to make calls (being a farmer)
            mockClientIdentity.assertAttributeValue.returns(true);

            const eggTrackingContract = new EggTrackingContract();

            // Add some random packs
            await eggTrackingContract.packEggs(transactionContext, 'farmer2','202106031608',30);
            await eggTrackingContract.packEggs(transactionContext, 'farmer2','202106031609',30);
            await eggTrackingContract.packEggs(transactionContext, 'farmer2','202106031610',30);

            const result = await eggTrackingContract.createShipment(transactionContext, 'farmer2','shipper2', 'dist2', '202106031700',1,10);

            const resultObj = JSON.parse(result);

            expect(resultObj.farmerId).to.eql('farmer2');
            expect(resultObj.shipperId).to.eql('shipper2');
            expect(resultObj.distributorId).to.eql('dist2');
            expect(resultObj.currentState).to.eql('READY');
            expect(resultObj.eggIds.length).to.be.equals(3);
            expect(resultObj.shipmentId).to.eql('EggShipment:farmer2:dist2:202106031700');

        });

        it('should not create shipment with less than x boxes', async() => {

            // The client is allowed to make calls (being a farmer)
            mockClientIdentity.assertAttributeValue.returns(true);

            const eggTrackingContract = new EggTrackingContract();

            // Add some packs
            await eggTrackingContract.packEggs(transactionContext, 'farmer2','202106031608',30);
            await eggTrackingContract.packEggs(transactionContext, 'farmer2','202106031609',30);
            await eggTrackingContract.packEggs(transactionContext, 'farmer2','202106031610',30);

            // at least 5 packages (and we have only 3)
            await expect(eggTrackingContract.createShipment(transactionContext, 'farmer2','shipper2', 'dist2', '202106031700',5,10))
                .to.be.rejectedWith(Error,'Insufficient amount of egg boxes 3 for the shipment. Minimum amount is 5');

        });        

        it('should create shipment with the maximum number of boxes', async() => {

            // The client is allowed to make calls (being a farmer)
            mockClientIdentity.assertAttributeValue.returns(true);

            const eggTrackingContract = new EggTrackingContract();

            // Add some packs
            await eggTrackingContract.packEggs(transactionContext, 'farmer2','202106031608',30);
            await eggTrackingContract.packEggs(transactionContext, 'farmer2','202106031609',30);
            await eggTrackingContract.packEggs(transactionContext, 'farmer2','202106031610',30);

            // create shipment with 2 boxes
            const result = await eggTrackingContract.createShipment(transactionContext, 'farmer2','shipper2', 'dist2', '202106031700',2,2);

            const resultObj = JSON.parse(result);

            expect(resultObj.eggIds.length).to.be.equals(2);

        });        

        it('should not allow duplicate shipments', async () => {
            // The client is allowed to make calls (being a farmer)
            mockClientIdentity.assertAttributeValue.returns(true);

            const eggTrackingContract = new EggTrackingContract();

            // Add some random packs
            await eggTrackingContract.packEggs(transactionContext, 'farmer2','202106031608',30);
            await eggTrackingContract.packEggs(transactionContext, 'farmer2','202106031609',30);

            const result = await eggTrackingContract.createShipment(transactionContext, 'farmer2','shipper2', 'dist2', '202106031700',1,10);

            // call again

            await expect(eggTrackingContract.createShipment(transactionContext, 'farmer2','shipper2', 'dist2', '202106031700',1,10))
            .to.be.rejectedWith(Error,'Shipment with key EggShipment:farmer2:dist2:202106031700 already exists');

        });

    });

    describe('load boxes', async() => {

        it('should load boxes of a shipment correctly', async() => {
            // The client is allowed to make calls (being a farmer or a shipper)
            mockClientIdentity.assertAttributeValue.returns(true);

            const eggTrackingContract = new EggTrackingContract();

            // Add some packs
            await eggTrackingContract.packEggs(transactionContext, 'farmer2','202106031608',30);
            await eggTrackingContract.packEggs(transactionContext, 'farmer2','202106031609',30);

            // create shipment with three boxes
            const result = await eggTrackingContract.createShipment(transactionContext, 'farmer2','shipper2', 'dist2', '202106031700',2,2);

            const resultObj = JSON.parse(result);

            const shipmentId = resultObj.shipmentId;

            // load boxes
            const resultLoad = await eggTrackingContract.loadBoxes(transactionContext,shipmentId, '202106031800');

            expect(resultLoad).to.be.equals('ok');

            // get the shipment id
            let shipment = await transactionContext.stub.getState(shipmentId);

            let shipmentObj = JSON.parse(shipment.toString());

            expect(shipmentObj.currentState).to.eql('LOADED');
            expect(shipmentObj.loadTimestamp).to.eql('202106031800');
            expect(shipmentObj.eggIds.length).to.be.equals(2);

            // get boxes to check if the holder was changed
            for(var i=0;i<shipmentObj.eggIds.length;i++) {
                let boxId = shipmentObj.eggIds[i];
                let box = await transactionContext.stub.getState(boxId);
                let boxObj = JSON.parse(box.toString());

                expect(boxObj.currentState).to.eql('TRANSIT');
                expect(boxObj.holderId).to.eql('shipper2');
            }
        })

        it('should not allow loading boxes twice', async() => {
            // The client is allowed to make calls (being a farmer or a shipper)
            mockClientIdentity.assertAttributeValue.returns(true);

            const eggTrackingContract = new EggTrackingContract();

            // Add some packs
            await eggTrackingContract.packEggs(transactionContext, 'farmer2','202106031608',30);
            await eggTrackingContract.packEggs(transactionContext, 'farmer2','202106031609',30);

            // create shipment with boxes
            const result = await eggTrackingContract.createShipment(transactionContext, 'farmer2','shipper2', 'dist2', '202106031700',2,2);

            const resultObj = JSON.parse(result);

            const shipmentId = resultObj.shipmentId;

            // load boxes
            const resultLoad = await eggTrackingContract.loadBoxes(transactionContext,shipmentId, '202106031800');

            await expect(eggTrackingContract.loadBoxes(transactionContext,shipmentId, '202106031800'))
                .to.be.rejectedWith(Error,'Shipment ID EggShipment:farmer2:dist2:202106031700 is not ready');

        })

        it('should generate error if loading unknown shipment', async() => {
            // The client is allowed to make calls (being a farmer or a shipper)
            mockClientIdentity.assertAttributeValue.returns(true);

            const eggTrackingContract = new EggTrackingContract();

            await expect(eggTrackingContract.loadBoxes(transactionContext,'UNKNOWN', '202106031800'))
                .to.be.rejectedWith(Error,'Shipment ID UNKNOWN not found');

        })        

        it('should not allow loading boxes for non shippers', async() => {
            // The client is allowed to make calls (being a farmer or shipper)
            mockClientIdentity.assertAttributeValue.returns(true);

            const eggTrackingContract = new EggTrackingContract();

            // Add some packs
            await eggTrackingContract.packEggs(transactionContext, 'farmer2','202106031608',30);
            await eggTrackingContract.packEggs(transactionContext, 'farmer2','202106031609',30);

            // create shipment with boxes
            const result = await eggTrackingContract.createShipment(transactionContext, 'farmer2','shipper2', 'dist2', '202106031700',2,2);

            const resultObj = JSON.parse(result);

            const shipmentId = resultObj.shipmentId;

            // The client is not allowed to make calls (not being a shipper)
            mockClientIdentity.assertAttributeValue.returns(false);
            mockClientIdentity.getID.returns('someoneElse');


            await expect(eggTrackingContract.loadBoxes(transactionContext,shipmentId, '202106031800'))
                .to.be.rejectedWith(Error,'Shipment can only be loaded by shippers or administrators');

        })        
    })

    describe('deliver boxes', async() => {

        it('should deliver boxes of a shipment correctly', async() => {
            // The client is allowed to make calls (being a farmer or a shipper)
            mockClientIdentity.assertAttributeValue.returns(true);

            const eggTrackingContract = new EggTrackingContract();

            // Add some packs
            await eggTrackingContract.packEggs(transactionContext, 'farmer2','202106031608',30);
            await eggTrackingContract.packEggs(transactionContext, 'farmer2','202106031609',30);

            // create shipment with boxes
            const result = await eggTrackingContract.createShipment(transactionContext, 'farmer2','shipper2', 'dist2', '202106031700',2,2);

            const resultObj = JSON.parse(result);

            const shipmentId = resultObj.shipmentId;

            // load boxes
            const resultLoad = await eggTrackingContract.loadBoxes(transactionContext,shipmentId, '202106031800');

            // deliver boxes
            const resultDeliver = await eggTrackingContract.deliverBoxes(transactionContext,shipmentId,'202106031900')

            // get the shipment for double checking
            let shipment = await transactionContext.stub.getState(shipmentId);

            let shipmentObj = JSON.parse(shipment.toString());

            expect(shipmentObj.currentState).to.eql('DELIVERED');
            expect(shipmentObj.deliveryDate).to.eql('202106031900');
            expect(shipmentObj.eggIds.length).to.be.equals(2);

            // get boxes to check if the holder was changed
            for(var i=0;i<shipmentObj.eggIds.length;i++) {
                let boxId = shipmentObj.eggIds[i];
                let box = await transactionContext.stub.getState(boxId);
                let boxObj = JSON.parse(box.toString());

                expect(boxObj.currentState).to.eql('IN_DIST_CENTRE');
                expect(boxObj.holderId).to.eql('dist2');
            }
        })

        it('should not allow delivering boxes twice', async() => {
            // The client is allowed to make calls (being a farmer or a shipper)
            mockClientIdentity.assertAttributeValue.returns(true);

            const eggTrackingContract = new EggTrackingContract();

            // Add some packs
            await eggTrackingContract.packEggs(transactionContext, 'farmer2','202106031608',30);
            await eggTrackingContract.packEggs(transactionContext, 'farmer2','202106031609',30);

            // create shipment with boxes
            const result = await eggTrackingContract.createShipment(transactionContext, 'farmer2','shipper2', 'dist2', '202106031700',2,2);

            const resultObj = JSON.parse(result);

            const shipmentId = resultObj.shipmentId;

            // load boxes
            const resultLoad = await eggTrackingContract.loadBoxes(transactionContext,shipmentId, '202106031800');

            // deliver boxes
            const resultDeliver = await eggTrackingContract.deliverBoxes(transactionContext,shipmentId,'202106031900')

            // try again
            await expect(eggTrackingContract.deliverBoxes(transactionContext,shipmentId,'202106031900'))
                .to.be.rejectedWith(Error,'Shipment ID EggShipment:farmer2:dist2:202106031700 is not loaded');

        })

        it('should generate error if delivering unknown shipment', async() => {
            // The client is allowed to make calls (being a farmer or a shipper)
            mockClientIdentity.assertAttributeValue.returns(true);

            const eggTrackingContract = new EggTrackingContract();

            await expect(eggTrackingContract.deliverBoxes(transactionContext,'UNKNOWN', '202106031900'))
                .to.be.rejectedWith(Error,'Shipment ID UNKNOWN not found');

        })        

        it('should not allow delivering boxes for non shippers', async() => {
            // The client is allowed to make calls (being a farmer or a shipper)
            mockClientIdentity.assertAttributeValue.returns(true);

            const eggTrackingContract = new EggTrackingContract();

            // Add some packs
            await eggTrackingContract.packEggs(transactionContext, 'farmer2','202106031608',30);
            await eggTrackingContract.packEggs(transactionContext, 'farmer2','202106031609',30);

            // create shipment with boxes
            const result = await eggTrackingContract.createShipment(transactionContext, 'farmer2','shipper2', 'dist2', '202106031700',2,2);

            const resultObj = JSON.parse(result);

            const shipmentId = resultObj.shipmentId;

            // load boxes
            const resultLoad = await eggTrackingContract.loadBoxes(transactionContext,shipmentId, '202106031800');

            // The client is not allowed to make calls (not being a shipper)
            mockClientIdentity.assertAttributeValue.returns(false);
            mockClientIdentity.getID.returns('someoneElse');

            // try to deliver boxes
            await expect(eggTrackingContract.deliverBoxes(transactionContext,shipmentId,'202106031900'))
            .to.be.rejectedWith(Error,'Shipment can only be delivered by shippers or administrators');
            
        })        

    })    


});
