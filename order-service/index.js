process.env.KAFKAJS_NO_PARTITIONER_WARNING = '1';

const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const { Kafka } = require('kafkajs');

// Load proto file
const packageDefinition = protoLoader.loadSync('order.proto');
const orderProto = grpc.loadPackageDefinition(packageDefinition);

// Create Kafka producer
const kafka = new Kafka({
    clientId: 'order-service',
    brokers: ['localhost:9092']
});
const producer = kafka.producer();

// Order data
let orders = [];
let orderIdCounter = 1;

async function startServer() {
    try {
        // Connect to Kafka first
        await producer.connect();
        console.log('Connected to Kafka');

        // Create gRPC server
        const server = new grpc.Server();

        server.addService(orderProto.OrderService.service, {
            CreateOrder: async (call, callback) => {
                const { productId, quantity } = call.request;
                const order = {
                    orderId: orderIdCounter++,
                    productId,
                    quantity,
                    status: 'PROCESSING'
                };
                orders.push(order);

                // Publish to Kafka
                await producer.send({
                    topic: 'orders',
                    messages: [{
                        value: JSON.stringify({
                            orderId: order.orderId,
                            productId,
                            quantity,
                            status: order.status
                        })
                    }]
                });

                callback(null, { orderId: order.orderId, status: order.status });
            }
        });

        // Start gRPC server
        server.bindAsync('0.0.0.0:50051', grpc.ServerCredentials.createInsecure(), (error, port) => {
            if (error) {
                console.error('Failed to bind server:', error);
                return;
            }
            console.log(`Order Service running on port ${port}`);
        });

    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

startServer();

// Handle graceful shutdown
process.on('SIGTERM', async () => {
    await producer.disconnect();
    process.exit(0);
});