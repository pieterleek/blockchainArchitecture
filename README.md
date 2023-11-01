##  Blockchain Architecture :: Practicum

This project aims at covering the development process of a permissioned blockchain network using Hyperledger Fabric (HLF) version 2.5. 

## Objectives

- Understand how participants, assets and transactions are designed in a permissioned blockchain network
- Manage identities
- Create a RESTful-based client using the Fabric SDK

## Prerequisites

This development environment has many prerequisites. If you are willing to install everything in your local machine, follow the remaining steps. 

### Hyperledger Fabric

You must have the Hyperledger Development Environment configured in your machine or a spare VM. If you do not have it yet, you can follow the instructions:

* Prerequisites (installation of cURL, Docker and Docker Composer, GO, NodeJS and NPM, Python, Git): [link](https://hyperledger-fabric.readthedocs.io/en/latest/prereqs.html)
* Install Samples, Binaries, and Docker Images: [link](https://hyperledger-fabric.readthedocs.io/en/latest/install.html)

### Visual Studio Code (Optional)

Visual Studio Code is a lightweight but powerful source code editor which runs on your desktop and is available for Windows, macOS and Linux. It comes with built-in support for JavaScript, the language used in this project to build smart contracts. 

You can download [Visual Studio code here](https://code.visualstudio.com/)

### Postman (Optional)

Postman is a collaboration platform for API development. In this exercise, Postman will be used as an HTTP client, allowing users to interact with the blockchain network using a REST-based API.

You can download [Postman here](https://www.postman.com/downloads/)

Alternatively, you can use a ready-to-use Linux Virtual Machine running on VirtualBox. More information can be found [here](https://gitlab.fdmci.hva.nl/blockchain/architecture/bc2-arch-week-1/-/blob/master/VM.md)

## The Use Case

The proposed use case is a simplified supply-chain process. An association of farmers, shippers and food distributors decided to optimise their business processes, creating a [consortium](https://hyperledger-fabric.readthedocs.io/en/latest/network/network.html#defining-a-consortium). The consortium uses a private permissioned blockchain network to do their business.

The diagram below illustrates the process.

![](doc/img/use-case.png)

As mentioned in previous classes, a private permissioned blockchain network has three main components:

1. Participants (blue boxes): In this case, farmers, shippers, and distributors
2. Assets (green boxes): An egg box collected by the farmer is an asset, as well as a shipment to the distributor, filled with boxes.
3. Transactions (grey boxes): The actions that change the world state through business logic are called **transactions**. Packing eggs in a box, creating a shipment request, loading the truck, delivering the eggs, or reporting a damaged box. The diagram below illustrates how these building blocks fit together.

![](doc/img/conceptual-model.png)

## Network Configuration

### Creating the Fabric network

During this step, you will create a local Fabric network, based on the *test-network*. This network is deployed with Docker Compose. 

To get started, you should first clone this project into your local computer:

```
git clone https://gitlab.fdmci.hva.nl/mfknr/bc2-arch-week-2.git
```

You will see a folder structure with these elements:

* **chaincode**: The business logic of the blockchain network
* **client/backend**: A backend application that allows users to interact with the blockchain network through a REST interface
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

Note: At any time, you can stop the network by running `./network.sh down`. If the script is taking to long to finish, try to restart Docker.

The figure below illustrates the consortium components:

![](doc/img/arch.png)

### Deploying the chaincode

A [chaincode](https://hyperledger-fabric.readthedocs.io/en/latest/developapps/contractname.html#chaincode) is a generic container for deploying code to a Hyperledger Fabric blockchain network. One or more related smart contracts are defined within a chaincode. Every smart contract has a name that uniquely identifies it within a chaincode. Applications access a particular smart contract within a chaincode using its contract name.

After you have used the network.sh startup command, you can deploy the chaincode on the channel using the following commands:

1. Go to fabric-samples/test-network
2. Execute the command:

```
./network.sh deployCC -ccn egg-tracking -ccp [base-folder]/bc2-arch-week-2/chaincode -ccv 1 -ccs 1 -ccl javascript
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

### Using the RESTful API

To interact with the API, we recommend you using Postman (see the prerequisites section). 

To speed up your tests, you can import the following collection with all ready-made calls from Postman :

```
https://www.getpostman.com/collections/2d24803cac6358a92477
```

Below, a summary of operations:

For each operation, analyse the source code and the changes in the world state and wallet produced by the API call. 

You can query the world state by using the Fauxton interface of CouchDB:

1. Open the [Fauxton interface for peer0.org1](http://localhost:5984/_utils/) or the [Fauxton interface for peer0.org2](http://localhost:7984/_utils/) 
2. Select the **mychannel_egg-tracking** database
3. Visualise the world state

Here a summary of calls:

```
Adding a Farmer

POST http://localhost:8080/rest/participants
{
   "id":"F5",
   "name":"Farmer 5",
   "role":"Farmer"
}
```
```
Adding a Shipper

POST http://localhost:8080/rest/participants
{
   "id":"S5",
   "name":"Shipper 5",
   "role":"Shipper"
}
```

```
Adding a Distributor

POST http://localhost:8080/rest/participants
{
   "id":"D5",
   "name":"Distributor 5",
   "role":"Distributor"
}
```


```
Packing Eggs

POST http://localhost:8080/rest/eggboxes
{
   "farmerId":"F5",
   "packingTimestamp":"20191224151230",
   "quantity":"30"
}
```
```
Creating a Shipment Request

POST http://localhost:8080/rest/shipments
{
   "farmerId":"F5",
   "shipperId":"S5",
   "distributorId":"D5",
   "shipmentCreation":"20191124154531",
   "min":"1",
   "max":"30"
}
```
```
Loading Boxes (see :shipmentId parameter)

POST http://localhost:8080/rest/shipments/:shipmentId/load
{
   "shipperId":"S5",
   "loadTimestamp":"20191124163412"
}
```
```
Delivering Boxes (see :shipmentId parameter)

POST http://localhost:8080/rest/shipments/:shipmentId/delivery
{
   "shipperId":"S5",
   "deliveryDate":"20191124172243"
}
```
```
Reporting Damaged Box (see :eggBoxId parameter)

POST http://localhost:8080/rest/eggboxes/:eggBoxId/damaged
{
   "participantId":"F5"
}
```

## Limitations

There are some limitations for the provided example:
- The wallet is fully managed by the client application
- The RESTful API is not secured

To discuss in class: What are the alternatives to address these limitations?
