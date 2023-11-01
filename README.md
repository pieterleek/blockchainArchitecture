##  HvA Blockchain Architecture :: Practicum Week 5

This project aims at discussing how a blockchain application can integrate with external systems. It also explores the consequences of making external calls, which force these external services to be deterministic.

## Objectives

- Review endorsement policies
- Discuss why blockchain applications might need to make external calls
- Understand why chaincode outcomes must be deterministic
- Make external calls from the chaincode

## Prerequisites

This development environment has many prerequisites. If you are willing to install everything in your local machine, follow the remaining steps. 

### Hyperledger Fabric

You must have the Hyperledger Development Environment configured in your machine or a spare Virtual Machine. If you do not have it yet, you can follow the instructions:

* Prerequisites (installation of cURL, Docker and Docker Composer, GO, NodeJS and NPM, Python, Git): [link](https://hyperledger-fabric.readthedocs.io/en/latest/prereqs.html)
* Install Samples, Binaries, and Docker Images: [link](https://hyperledger-fabric.readthedocs.io/en/latest/install.html)

### Visual Studio Code

Visual Studio Code is a lightweight but powerful source code editor which runs on your desktop and is available for Windows, macOS and Linux. It comes with built-in support for JavaScript, the language used in this project to build smart contracts. 

You can download [Visual Studio code here](https://code.visualstudio.com/)

### Postman

Postman is a collaboration platform for API development. In this exercise, Postman is used as an HTTP client, allowing users to interact with the blockchain network using a REST-based API.

You can download [Postman here](https://www.postman.com/downloads/)

Alternatively, you can use a ready-to-use Linux Virtual Machine running on VirtualBox. More information can be found [here](https://gitlab.fdmci.hva.nl/blockchain/architecture/bc2-arch-week-1/-/blob/master/VM.md)

## The Use Case

The proposed use case is based on a simplified supply-chain process. An association of farmers, shippers and food distributors decided to optimise their businesses, creating a consortium. The consortium uses a private permissioned blockchain network to do their business.

To know more, you can go to the [use case section of the previous workshop](https://gitlab.fdmci.hva.nl/mfknr/bc-arch-week-3#the-use-case)

### A change in the workflow

Poultry may carry bacteria such as Salmonella, which can contaminate the inside of eggs before the shells are formed. To mitigate the problem of contamination, the Foods Standard Agency implemented a new workflow. Farms are regularly inspected, and to be eligible to operate, they should be approved by the agency.

The agency database now has a list of farmers and their current situation, answering if the farmer is allowed or not to pack egg boxes. New packages of eggs collected by the farmer must have an approval stamp from the agency. This approval stamp should be present in the package information for traceability purposes.

![](doc/img/external.png)

The problem is that the Foods Standard Agency is **not part of the consortium**, and the only way to get the farmer status is by using the API provided by the agency.

## Deterministic versus non-deterministic calls

This section explorers the requirements of external calls from the blockchain network: every request must be deterministic.

### Changes in the contract

A smart contract is typically able to validate requests, apply the business rules and return a deterministic result. However, there are situations where additional facts are required to perform the transaction. For this use case, one first need to know if the farmer is allowed to operate and if yes, a certificate should be issued.

In general, private blockchain networks allows external calls to third-party systems from smart contracts. However, it is the responsibility of the developer of the smart contract to ensure that the resulting read and write sets are deterministic.

Take a look at changes made in the [*packEggs* transaction](https://gitlab.fdmci.hva.nl/mfknr/bc2-arch-week-5/-/blob/master/chaincode/lib/egg-tracking-contract.js). One should make REST call to an external address and get the stamp before generating the package.

```
http://[EXTERNAL_API_SERVER]/farmer/farmer1@egg.nl?packingTimestamp=20191115155703
```

Where *EXTERNAL_API_SERVER* points to the full address of the external server, *farmer1@egg.nl* is the identifier of the farmer, and *packingTimestamp* is the timestamp at the moment of the call.

The result of the call looks like this:

```
{
    "id": "farmer1@egg.nl",
    "stamp": "farmer1@egg.nl-161803398875"
}
```

### Starting your own external server

To get started, you should first clone this project into your local computer:

```
git clone https://gitlab.fdmci.hva.nl/mfknr/bc2-arch-week-5.git
```

You see a folder structure with these elements:

* **external-api**: The source code of the external API
* **network**: The blockchain network configuration
* **chaincode**: The business logic of the blockchain network
* **client/backend**: A backend application that allows users to interact with the blockchain network through a REST interface
* **client/frontend**: An Angular application that interacts with the backend
* **doc**: Some documentation elements

To create a simulated version of the external server, you should follow the steps:

1. Go to the *external-api* folder of the project.
2. Run `npm install` to install the dependencies of the application (basically *node express*)
3. Run `node app.js` from the console. The server starts running on port 9067.

To test if the server is running, execute the following call:

[http://localhost:9067/farmer/farmer1@egg.nl?packingTimestamp=20191115155703](http://localhost:9067/farmer/farmer1@egg.nl?packingTimestamp=20191115155703)

Now, your server is up and running. But it is inaccessible via the internet. Also, Hyperledger Fabric uses Docker, that cannot recognise the running service. The reason is that the docker container itself is localhost. 

To make your address visible, we are using a tunnelling service called *ngrok*, that turn any local endpoint into a remote endpoint.

First, install ngrok via [this address](https://ngrok.com/)

run the following command from your terminal to make your server accessible:

```
ngrok http 9067
```

ngrok starts and displays some information and the forwarding addresses (both HTTP and HTTPS). For example: http://09d15956.ngrok.io

Now you can access the URL from any device, replacing the reference to localhost to the new address:

For example: http://09d15956.ngrok.io/farmer/farmer1@egg.nl?packingTimestamp=20191115155703

You should change the smart contract contract/egg-tracking-contract.js, by replacing the value of the constant EXTERNAL_API_SERVER to the address provided by ngrok.

## Network Configuration

### Creating the Fabric network

During this step, you will create a local Fabric network, based on the *test-network*. This network is deployed with Docker Compose. 

To get started, you should first clone this project into your local computer:

```
git clone https://gitlab.fdmci.hva.nl/mfknr/bc2-arch-week-5.git
```

You will see a folder structure with three elements:

* **chaincode**: The business logic of the blockchain network
* **client/backend**: A backend application that allows users to interact with the blockchain network through a REST interface
* **client/frontend**: An Angular application that interacts with the backend
* **doc**: Some documentation elements

### Startup commands

In this step, you will start your blockchain network. You should follow these instructions:

1. Open a terminal screen

3. Go to `fabric-samples/test-network` folder, normally installed in the home folder of your file system

5. Execute the following command to create and start the blockchain network: 

```
./network.sh up createChannel -ca -s couchdb 
```

Where, the *up* command will start the network by using docker containers, the *createChannel* command will create the default channel *myChannel*, the *-ca* option will create certificate authorities for organisations 1 and 2, and the *-s couchdb* option enables the CouchDB database per peer. 

Note: At any time, you can stop the network by running `./network.sh down`. At the time of writing this tutorial, the Docker desktop version is 4.18.0. If the script is taking to long to finish, try to restart Docker.

The figure below illustrates the consortium components:

![](doc/img/arch.png)

### Deploying the chaincode

A [chaincode](https://hyperledger-fabric.readthedocs.io/en/latest/developapps/contractname.html#chaincode) is a generic container for deploying code to a Hyperledger Fabric blockchain network. One or more related smart contracts are defined within a chaincode. Every smart contract has a name that uniquely identifies it within a chaincode. Applications access a particular smart contract within a chaincode using its contract name.

After you have used the network.sh startup command, you can deploy the chaincode on the channel using the following commands:

1. Go to fabric-samples/test-network
2. Execute the command:

```
./network.sh deployCC -ccn egg-tracking -ccp [base-folder]/bc2-arch-week-5/chaincode -ccv 1 -ccs 1 -ccl javascript
```

Where [base-folder] is the location where you cloned this project, egg-tracking is the name of the chaincode, the parameter -ccl javascript is the language used to write the chaincode. This example was built with javascript. The parameter -ccv 1 and -ccs 1 refers to the version and sequence. If you change something in your chaincode and wants to redeploy, you should increment these values.

## Client Interaction

In a typical business blockchain application, network participants invoke smart contracts by using a client. The client, in turn, is responsible for submitting the transaction to peers and return the response to the client. 

This example has a client that exposes a RESTful API to interact with a blockchain network. This approach is useful if you have a variety of clients like web applications, mobile applications, and IoT devices, for example. 

Now we are examining how to interact with the network.

### Getting acquainted with the client source-code

Using your editor, take a look at files at the *client/backend* folder. Spend some minutes getting acquainted with the folder structure.

* **src/app.js**: This source-code exposes the API. It uses the Express library to expose resources
* **src/fabric/network.js**: This source-code uses the Fabric API to connect to the network
* **config.json**: This file contains relevant information for the connection
* **package.json**: This file contains the required library to run the app.

A client needs some basic information to connect to the network. You will see that the file config.json is pointing to a [connection profile](https://hyperledger-fabric.readthedocs.io/en/latest/developapps/connectionprofile.html). Take some minutes to analyse this file.

### Installing client dependencies 

First, you should install the dependencies.

Using the terminal window, execute the following command in the **client/backend** folder:

```
npm --logevel=error install
```

This command will install all dependencies in the *node_modules* folder.

### Setting up HLF network configuration

Our client programs are using the test-network connection profile to connect to the network. All programs are using the FABRIC_PATH variable. Thus, by using your terminal, you should create the variable FABRIC_PATH pointing to the folder of your fabric-samples, for example:

```
export FABRIC_PATH=~/fabric-samples
```

### Adding the first user to the wallet

A [wallet](https://hyperledger-fabric.readthedocs.io/en/latest/developapps/wallet.html) contains a set of user identities. An application run by a user selects one of these identities when it connects to a channel. An application run by a user selects one of the available identities when it connects to a channel.

The administrator of an organisation can issue certificates to new users. You will need that to create the participants of the egg tracking network such as farmers, distributors and shippers. Thus, you should export the admin certificate to the **client/backend/wallet** folder. To do so, execute the following operation:

```
node src/enrollAdmin.js
```

This command logs in to the certificate authority of organisation 1 and download the certificate of the administrator of org1, and add it to the *wallet* folder. 

Note: If you run this command again, you should manually remove the previous certificate file of the admin user(*admin.id*). Otherwise, the system will generate an error message telling that the certificate already exists.

Now you are ready to run the application.

### Running the client

You can start the API by executing the following command in the *client/backend* folder:

```
npm start
```

This command will start an HTTP server running on port 8080.

### Experiments

To interact with the API, we recommend you using Postman (see the prerequisites section). 

To speed up your tests, you can import the following collection with all ready-made calls from Postman :

```
https://www.getpostman.com/collections/70de359afca2fd312e9d
```

## Transaction Endorsement

The consensus in Hyperledger Fabric is reached through endorsement. Every chaincode has an endorsement policy which specifies the set of peers on a channel that must execute chaincode and endorse the execution results for the transaction to be considered valid. These endorsement policies define the organizations (through their peers) who must “endorse” (i.e., approve of) the execution of a proposal [1].

As part of the transaction validation step performed by the peers, each validating peer checks to make sure that the transaction contains the appropriate number of endorsements and that they are from the expected sources (both of these are specified in the endorsement policy). The endorsements are also checked to make sure they’re valid (i.e., that they are valid signatures from valid certificates) [1].

An endorsement policy is a condition on what endorses a transaction. Blockchain peers have a pre-specified set of endorsement policies, which are referenced by a deploy transaction that installs specific chaincode. Endorsement policies can be parametrized, and these parameters can be specified by a deploy transaction.

Take a look at configtx.yaml: the endorsement policy for the application chaincode is MAJORITY.

![](doc/img/configtx.png)

The figure below presents the standard workflow of chaincode transaction execution and endorsement.

![](doc/img/transaction.png)


### Deterministic calls

Try to generate one or more egg packages. Make sure that you change the farmer id to the current user logged in the front-end application. Do not forget to set the token as part of the authorisation header.

```
Example of a call: Packing Eggs

POST http://localhost:8080/rest/eggboxes
Authorization: Bearer eyJhbGciOiJSUzI1NiIsImt...
{
   "farmerId":"eggtrackingf1@gmail.com",
   "packingTimestamp":"20191224151230",
   "quantity":"30"
}
```

You can query the world-state database, checking if the Food Agency stamp is present.

- [World State DB of peer0.org1](http://localhost:5984/_utils/)
- [World State DB of peer0.org2](http://localhost:7984/_utils/)


### Non-deterministic calls

The behaviour of the Food Standards Agency is deterministic. In other words, the function returns the same value for a parameter set. It does not matter how many times the function was called. You can test, by making the following call (also available in the collection):

http://localhost:9067/farmer/farmer1@egg.nl?packingTimestamp=20191115155703

Now, we are simulating a situation where the function can return different values. In our application, the endorsement policy states that two peers should endorse the transaction (see the contract/deploy.sh script and the rule AND ('Org1MSP.peer','Org2MSP.peer').
To change the behaviour of the external API, make the following call (also available in the collection):

```
POST http://localhost:9067/config
{
   "deterministic":false
}
```

If you execute the call to get the stamp, you'll see different results.

http://localhost:9067/farmer/farmer1@egg.nl?packingTimestamp=20191115155703

Try to generate one package. What happens? Examine the log files of both peers.


### Changing the endorsement policy at the chaincode level

Endorsement policies can be specified at the channel or chaincode level. Want to make an experiment, setting a specific endorsement policy? 

Try to deploy your smart contract using the -CCEP option:

For example, the following endorsement policy is much more lenient, requiring that at least one peer of one of the organisations sign the transaction:

```
-ccep "OR('Org1MSP.peer','Org2MSP.peer')"
```

### To know more

1. Hyperledger Fabric 2.x Documentation: https://hyperledger-fabric.readthedocs.io/en/release-2.2/endorsement-policies.html#:~:text=Every%20chaincode%20has%20an%20endorsement,transaction%20to%20be%20considered%20valid.
