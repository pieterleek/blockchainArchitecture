'use strict';

const {Contract} = require('fabric-contract-api');

class AccountContract extends Contract {

    async initLedger(ctx) {
        console.log('Init ledger called');
    }

    async addAccount(ctx,iban,owner,balance) {
        let account = {
            'iban':iban,
            'owner':owner,
            'balance':balance
        }
        await ctx.stub.putState(iban,Buffer.from(JSON.stringify(account)));
        console.log('account added with success');
    }

    async getAccount(ctx,iban) {
        console.info('querying for IBAN: ' + iban);
        let returnAsBytes = await ctx.stub.getState(iban);
        let result = JSON.parse(returnAsBytes);
        return JSON.stringify(result);
    }

    async getAllAccounts(ctx) {
        const iterator = await ctx.stub.getStateByRange('',''); // all ranges

        const allResults = [];
        while (true) {
            const res = await iterator.next();

            if (res.value && res.value.value.toString()) {
                console.log(res.value.value.toString('utf8'));

                const Key = res.value.key;
                let Record;
                try {
                    Record = JSON.parse(res.value.value.toString('utf8'));
                } catch (err) {
                    console.log(err);
                    Record = res.value.value.toString('utf8');
                }
                allResults.push({ Key, Record });
            }
            if (res.done) {
                console.log('end of data');
                await iterator.close();
                console.info(allResults);
                return JSON.stringify(allResults);
            }
        }
    }

    // Transfering money from A to B
    async transfer(ctx, a, b, amount) {

        amount = parseFloat(amount);

        // get the first account from the state
        let accountABytes = await ctx.stub.getState(a);
        
        if(!accountABytes)
            throw new Error('account ' + a + ' not found');

        let accountA = JSON.parse(accountABytes);
        let balanceA = parseFloat(accountA.balance);

        // get the second account from the state
        let accountBBytes = await ctx.stub.getState(b);

        if(!accountBBytes)
            throw new Error('account ' + b + ' not found');        

        let accountB = JSON.parse(accountBBytes);
        let balanceB = parseFloat(accountB.balance);

        // check if A has enough funds
        if(balanceA < amount) {
            throw new Error('account ' + a + ' with insufficient funds');
        }

        // decrease the balance of the source account A
        balanceA -= amount
        
        // increase the balance of the target account B
        balanceB += amount;

        // update account objects
        accountA.balance = balanceA.toString();
        accountB.balance = balanceB.toString();
        
        // update state
        await ctx.stub.putState(a,Buffer.from(JSON.stringify(accountA)));
        await ctx.stub.putState(b,Buffer.from(JSON.stringify(accountB)));
    }
}

module.exports = AccountContract;