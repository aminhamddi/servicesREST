const { Kafka, logLevel } = require('kafkajs');

const kafka = new Kafka({
    clientId: 'notification-service',
    brokers: ['localhost:9092'],
    logLevel: logLevel.INFO,
    retry: {
        initialRetryTime: 3000,
        retries: 10
    }
});

const consumer = kafka.consumer({ groupId: 'notification-group' });

const run = async () => {
    try {
        console.log('Connecting to Kafka...');
        await consumer.connect();
        console.log('Connected to Kafka!');

        await consumer.subscribe({ topic: 'orders', fromBeginning: true });
        console.log('Subscribed to "orders" topic');

        await consumer.run({
            eachMessage: async ({ topic, partition, message }) => {
                console.log(`New order received:`, {
                    key: message.key?.toString(),
                    value: message.value.toString(),
                    headers: message.headers
                });
            },
        });
    } catch (error) {
        console.error('Kafka error:', error);
        process.exit(1);
    }
};

run().catch(console.error);

process.on('SIGTERM', async () => {
    await consumer.disconnect();
});