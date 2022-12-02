import {
    OPCUAClient,
    MessageSecurityMode,
    SecurityPolicy,
    AttributeIds,
    makeBrowsePath,
    NodeClass,
    ClientSubscription,
    TimestampsToReturn,
    MonitoringParametersOptions,
    ReadValueIdOptions,
    ClientMonitoredItem,
    DataValue
  } from "node-opcua";

    const endpointUrl = "opc.tcp://opc.mtconnect.org:4840";

    const client = OPCUAClient.create({
        endpointMustExist: false
    });

    async function main() {
        try {
            await client.connect(endpointUrl);
            console.log("connected !");

            const session = await client.createSession();
            console.log("session created !");

            const browsePath = makeBrowsePath("RootFolder", "/Objects/4:MFMS10-MC2/4:Components/4:Door/4:DoorState");
            const result = await session.translateBrowsePath(browsePath);
            const nodeId = result.targets[0].targetId;

            const browseResult = await session.browse({
                nodeId,
                nodeClassMask: NodeClass.Variable, // we only want sub node that are Variables
                resultMask: 63 // extract all information possible 
            });


            for(const reference of browseResult.references) {
                console.log( "   -> ", reference.toJSON());
            }

            const maxAge = 0;
            const nodeToRead = {
                nodeId: nodeId,
                attributeId: AttributeIds.Value
            };
            const dataValue = await session.read(nodeToRead, maxAge);

            console.log("value", dataValue.toJSON());
            

            
            const subscription = ClientSubscription.create(session, {
                requestedPublishingInterval: 1000,
                requestedLifetimeCount: 100,
                requestedMaxKeepAliveCount: 12,
                maxNotificationsPerPublish: 10,
                publishingEnabled: true,
                priority: 10
            });

            subscription.on("started", function () {
                console.log("subscription started for 2 seconds - subscriptionId=", subscription.subscriptionId);
            }).on("keepalive", function () {
                console.log("keepalive");
            }).on("terminated", function () {
                console.log("terminated");
            });

            // install monitored item
            const itemToMonitor: ReadValueIdOptions = {
                nodeId: nodeId,
                attributeId: AttributeIds.Value
            };
            const parameters: MonitoringParametersOptions = {
                samplingInterval: 100,
                discardOldest: true,
                queueSize: 10
            };

            const monitoredItem = ClientMonitoredItem.create(subscription,
                itemToMonitor,
                parameters,
                TimestampsToReturn.Both
            );

            monitoredItem.on("changed", (dataValue: DataValue) => {
                console.log(" %s = %s", nodeId.toString(), dataValue.value.value);
            });

        }
        catch (err) {
            console.log("An error has occured : ", err);
        }
    }

    main();
 