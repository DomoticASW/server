import mongoose, { Connection } from "mongoose";

const DB_URIS = {

    deviceGroupsDB: "mongodb://localhost:27017/DomoticASW",

};

const connections: Record<string, Connection> = {};

export const connectDBs = async () => {

    try {

        connections.deviceGroupsDB = await mongoose.createConnection(DB_URIS.deviceGroupsDB).asPromise();

        console.log("Connected to DeviceGroupsDB");

    } catch (error) {

        console.error("MongoDB connection error:", error);

        process.exit(1);

    }

};

export const getDBConnection = (dbName: keyof typeof DB_URIS): Connection => {

    return connections[dbName];

};
