const express = require('express');
const { ApolloServer, gql } = require('apollo-server-express');
const axios = require('axios');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');


const packageDefinition = protoLoader.loadSync('../order-service/order.proto');
const orderProto = grpc.loadPackageDefinition(packageDefinition);
const orderClient = new orderProto.OrderService('localhost:50051', grpc.credentials.createInsecure());


const typeDefs = gql`
  type Product {
    id: ID!
    name: String!
    price: Float!
  }

  type Order {
    id: ID!
    productId: ID!
    status: String!
  }

  type Query {
    products: [Product]
    product(id: ID!): Product
  }

  type Mutation {
    createOrder(productId: ID!, quantity: Int!): Order
  }
`;

const resolvers = {
    Query: {
        products: async () => {
            const response = await axios.get('http://localhost:3001/products');
            return response.data;
        },
        product: async (_, { id }) => {
            const response = await axios.get(`http://localhost:3001/products/${id}`);
            return response.data;
        }
    },
    Mutation: {
        createOrder: (_, { productId, quantity }) => {
            return new Promise((resolve, reject) => {
                orderClient.CreateOrder({ productId: parseInt(productId), quantity }, (err, response) => {
                    if (err) reject(err);
                    resolve({
                        id: response.orderId,
                        productId,
                        status: response.status
                    });
                });
            });
        }
    }
};

async function startServer() {
    const app = express();
    const server = new ApolloServer({ typeDefs, resolvers });

    await server.start(); 

    server.applyMiddleware({ app });

    app.listen(4000, () => {
        console.log(`API Gateway running on http://localhost:4000${server.graphqlPath}`);
    });
}

startServer().catch(err => {
    console.error('Failed to start server:', err);
});