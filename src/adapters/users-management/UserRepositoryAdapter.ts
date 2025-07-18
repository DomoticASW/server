import mongoose from "mongoose";
import { Effect, pipe } from "effect";
import { flatMap, orDie, succeed, tryPromise, fail } from "effect/Effect";
import { UserRepository } from "../../ports/users-management/UserRepository.js";
import { Email, Nickname, PasswordHash, User } from "../../domain/users-management/User.js";
import { NotFoundError, DuplicateIdError } from "../../ports/Repository.js";

export interface UserRequestSchema {
    _id: string;
    nickname: string;
    passwordHash: string;
    role: string;
}

export class UserRepositoryAdapter implements UserRepository {

    private userRequestSchema = new mongoose.Schema<UserRequestSchema>({
        _id: { type: String, required: true },
        nickname: { type: String, required: true },
        passwordHash: { type: String, required: true },
        role: { type: String, required: true },
    });

    private userRequest: mongoose.Model<UserRequestSchema>;

    constructor(connection: mongoose.Connection) {
        this.userRequest =
            connection.models.UserRequest ||
            connection.model<UserRequestSchema>(
                "UserRequest",
                this.userRequestSchema
            );
    }

    add(entity: User): Effect.Effect<void, DuplicateIdError> {
        return tryPromise({
            try: async () => {
                const user = new this.userRequest({
                    _id: entity.email,
                    nickname: entity.nickname,
                    passwordHash: entity.passwordHash,
                    role: entity.role,
                });
                await user.save();
            },
            catch: () => DuplicateIdError(),
        });
    }

    update(entity: User): Effect.Effect<void, NotFoundError> {
        return tryPromise({
            try: async () => {
                const user = await this.userRequest.findByIdAndUpdate(
                    entity.email,
                    {
                        _id: entity.email,
                        nickname: entity.nickname,
                        passwordHash: entity.passwordHash,
                        role: entity.role,
                    },
                    { new: true }
                );
                if (!user) {
                    throw NotFoundError();
                }
            },
            catch: () => NotFoundError(),
        });
    }

    remove(id: Email): Effect.Effect<void, NotFoundError> {
        return tryPromise({
            try: async () => {
                const user = await this.userRequest.findByIdAndDelete(id);
                if (!user) {
                    throw NotFoundError();
                }
            },
            catch: () => NotFoundError(),
        });
    }

    getAll(): Effect.Effect<Iterable<User>, never> {
        return tryPromise(async () => {
            const users = await this.userRequest.find();
            return users.map(user => this.toEntity(user));
        }).pipe(orDie);
    }

    find(id: Email): Effect.Effect<User, NotFoundError> {
        const promise = async () => await this.userRequest.findById(id);
        return pipe(
            tryPromise(promise),
            orDie,
            flatMap(user => {
                if (user) {
                    return succeed(this.toEntity(user));
                } else {
                    return fail(NotFoundError())
                }
            })
        );
    }

    toEntity(user: UserRequestSchema): User {
        return User(Nickname(user.nickname), Email(user._id), PasswordHash(user.passwordHash), user.role as User["role"]);
    }
}
