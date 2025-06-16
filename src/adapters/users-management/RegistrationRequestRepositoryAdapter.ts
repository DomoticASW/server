import mongoose from "mongoose";
import { Effect, pipe } from "effect";
import { flatMap, orDie, succeed, tryPromise, fail } from "effect/Effect";
import { RegistrationRequestRepository } from "../../ports/users-management/RegistrationRequestRepository.js";
import { Email, Nickname, PasswordHash } from "../../domain/users-management/User.js";
import { RegistrationRequest } from "../../domain/users-management/RegistrationRequest.js";
import { DuplicateIdError, NotFoundError } from "../../ports/Repository.js";

export interface RegistrationRequestSchema {
    _id: string,
    nickname: string,
    passwordHash: string
}

export class RegistrationRequestRepositoryAdapter implements RegistrationRequestRepository {
    
    private registrationRequestSchema = new mongoose.Schema<RegistrationRequestSchema>({
        _id: { type: String, required: true },
        nickname: { type: String, required: true },
        passwordHash: { type: String, required: true }
    });
    
    private registrationRequest: mongoose.Model<RegistrationRequestSchema>;
    
    constructor(connection: mongoose.Connection) {
        this.registrationRequest =
        connection.models.RegistrationRequest ||
        connection.model<RegistrationRequestSchema>(
            "RegistrationRequest",
            this.registrationRequestSchema
        );
    }
    
    add(entity: RegistrationRequest): Effect.Effect<void, DuplicateIdError> {
        return tryPromise({
            try: async () => {
                const RR = new this.registrationRequest({ _id: entity.email, nickname: entity.nickname, passwordHash: entity.passwordHash });
                await RR.save();
            },
            catch: () => DuplicateIdError(),
        });
    }
    
    update(entity: RegistrationRequest): Effect.Effect<void, NotFoundError> {
        return tryPromise({
            try: async () => {
                const RR = await this.registrationRequest.findByIdAndUpdate(
                    entity.email,
                    { _id: entity.email, nickname: entity.nickname, passwordHash: entity.passwordHash  },
                    { new: true }
                );
                if (!RR) {
                    throw NotFoundError();
                }
            },
            catch: () => NotFoundError(),
        });
    }
    
    remove(id: Email): Effect.Effect<void, NotFoundError> {
        return tryPromise({
            try: async () => {
                const RR = await this.registrationRequest.findByIdAndDelete(id);
                if (!RR) {
                    throw NotFoundError();
                }
            },
            catch: () => NotFoundError(),
        });
    }
    
    getAll(): Effect.Effect<Iterable<RegistrationRequest>, never> {
        return tryPromise(async () => {
            const RRs = await this.registrationRequest.find();
            return RRs.map(RR => this.toEntity(RR))
        }).pipe(orDie);
    }
    
    find(id: Email): Effect.Effect<RegistrationRequest, NotFoundError> {
        const promise = async () => await this.registrationRequest.findById(id);
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
        return RegistrationRequest(Nickname(registrationRequest.nickname), Email(registrationRequest._id), PasswordHash(registrationRequest.passwordHash));
    }
}
