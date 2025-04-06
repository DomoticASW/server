import mongoose from "mongoose"

export enum MongoDBErrorCodes {
    DuplicateKey = 11000
}

export function isMongoServerError(error: unknown, code: MongoDBErrorCodes): boolean {
    return error instanceof mongoose.mongo.MongoServerError && error.code == code
}
