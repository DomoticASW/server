import mongoose from "mongoose";
import { Effect, pipe } from "effect";
import { flatMap, orDie, succeed, tryPromise } from "effect/Effect";
import { RegistrationRequestRepository } from "../../../src/ports/users-management/RegistrationRequestRepository.js";
import { Email, Nickname, PasswordHash } from "../../domain/users-management/User.js";
import { RegistrationRequest } from "../../domain/users-management/RegistrationRequest.js";
import { DuplicateIdError, NotFoundError } from "../../ports/users-management/Errors.js";

export interface RegistrationRequestSchema {
    nickname: string,
    email: string,
    passwordHash: string
}

export class RegistrationRequestRepositoryAdapter implements RegistrationRequestRepository {
    
    private registrationRequestSchema = new mongoose.Schema<RegistrationRequestSchema>({
        nickname: { type: String, required: true },
        email: { type: String, required: true, unique: true },
        passwordHash: { type: String, required: true }
    });
    
    private registrationRequest: mongoose.Model<RegistrationRequestSchema>;
    
    constructor(connection: mongoose.Connection) {
        this.registrationRequest =
        connection.models.RegistarationRequest ||
        connection.model<RegistrationRequestSchema>(
            "RegistarationRequest",
            this.registrationRequestSchema
        );
    }
    
    add(entity: RegistrationRequest): Effect.Effect<void, DuplicateIdError> {
        return tryPromise({
            try: async () => {
                const RR = new this.registrationRequest({ nickname: entity.nickname, email: entity.email, passwordHash: entity.passwordHash });
                await RR.save();
            },
            catch: () => DuplicateIdError(),
        });
    }
    
    update(entity: RegistrationRequest): Effect.Effect<void, NotFoundError> {
        return tryPromise({
            try: async () => {
                const RR = await this.registrationRequest.findOneAndUpdate(
                    { email: entity.email },
                    { nickname: entity.nickname, email: entity.email, passwordHash: entity.passwordHash },
                    { new: true }
                );
                if (!RR) {
                    throw NotFoundError();
                }
            },
            catch: () => NotFoundError(),
        }).pipe(orDie);
    }
    
    remove(id: Email): Effect.Effect<void, NotFoundError> {
        return tryPromise({
            try: async () => {
                const RR = await this.registrationRequest.findOneAndDelete({ email: id });
                if (!RR) {
                    throw NotFoundError();
                }
            },
            catch: () => NotFoundError(),
        }).pipe(orDie);
    }
    
    getAll(): Effect.Effect<Iterable<RegistrationRequest>, never> {
        return tryPromise(async () => {
            const RRs = await this.registrationRequest.find();
            return RRs.map(RR => this.toEntity(RR))
        }).pipe(orDie);
    }
    
    find(id: Email): Effect.Effect<RegistrationRequest, NotFoundError> {
        const promise = async () => await this.registrationRequest.findOne({ email: id })
        return pipe(
            tryPromise(promise),
            orDie,
            flatMap(RR => {
                if (RR) {
                    return succeed(this.toEntity(RR))
                } else {
                    return fail(NotFoundError())
                }
            })
        )
        
    }
    
    toEntity(registrationRequest: RegistrationRequestSchema): RegistrationRequest {
        return RegistrationRequest(Nickname(registrationRequest.nickname), Email(registrationRequest.email), PasswordHash(registrationRequest.passwordHash));
    }
}
