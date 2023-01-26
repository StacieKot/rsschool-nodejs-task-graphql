import { FastifyPluginAsyncJsonSchemaToTs } from '@fastify/type-provider-json-schema-to-ts';
import { idParamSchema } from '../../utils/reusedSchemas';
import {
  createUserBodySchema,
  changeUserBodySchema,
  subscribeBodySchema,
} from './schemas';
import type { UserEntity } from '../../utils/DB/entities/DBUsers';

const plugin: FastifyPluginAsyncJsonSchemaToTs = async (
  fastify
): Promise<void> => {
  fastify.get('/', async function (request, reply): Promise<UserEntity[]> {
    return await fastify.db.users.findMany();
  });

  fastify.get(
    '/:id',
    {
      schema: {
        params: idParamSchema,
      },
    },
    async function (request, reply): Promise<UserEntity> {
      const user = await fastify.db.users.findOne({
        key: 'id',
        equals: request.params.id,
      });

      if (user) {
        return user;
      }

      throw reply.status(404);
    }
  );

  fastify.post(
    '/',
    {
      schema: {
        body: createUserBodySchema,
      },
    },
    async function (request, reply): Promise<UserEntity> {
      return await fastify.db.users.create(request.body);
    }
  );

  fastify.delete(
    '/:id',
    {
      schema: {
        params: idParamSchema,
      },
    },
    async function (request, reply): Promise<UserEntity> {
      try {
        const profile = await fastify.db.profiles.findOne({
          key: 'userId',
          equals: request.params.id,
        });

        if (profile) {
          fastify.db.profiles.delete(profile.id);
        }

        const posts = await fastify.db.posts.findMany({
          key: 'userId',
          equals: request.params.id,
        });

        if (posts.length) {
          posts.forEach((post) => fastify.db.posts.delete(post.id));
        }

        const subscribedUsers = await fastify.db.users.findMany({
          key: 'subscribedToUserIds',
          inArray: request.params.id,
        });

        subscribedUsers.forEach((user) => {
          user.subscribedToUserIds = user.subscribedToUserIds.filter(
            (id) => id !== request.params.id
          );

          fastify.db.users.change(user.id, user);
        });

        return await fastify.db.users.delete(request.params.id);
      } catch {
        throw reply.status(400);
      }
    }
  );

  fastify.post(
    '/:id/subscribeTo',
    {
      schema: {
        body: subscribeBodySchema,
        params: idParamSchema,
      },
    },
    async function (request, reply): Promise<UserEntity> {
      try {
        const user = await fastify.db.users.findOne({
          key: 'id',
          equals: request.body.userId,
        });

        if (!user) {
          throw reply.status(400);
        }

        user.subscribedToUserIds.push(request.params.id);

        return await fastify.db.users.change(request.body.userId, user);
      } catch {
        throw reply.status(400);
      }
    }
  );

  fastify.post(
    '/:id/unsubscribeFrom',
    {
      schema: {
        body: subscribeBodySchema,
        params: idParamSchema,
      },
    },
    async function (request, reply): Promise<UserEntity> {
      try {
        const user = await fastify.db.users.findOne({
          key: 'id',
          equals: request.body.userId,
        });

        if (!user) {
          throw reply.status(400);
        }

        const isFollowing = user.subscribedToUserIds.find(
          (id) => id !== request.params.id
        );

        if (!isFollowing) {
          throw reply.status(400);
        }

        user.subscribedToUserIds = user.subscribedToUserIds.filter(
          (id) => id !== request.params.id
        );

        return await fastify.db.users.change(request.body.userId, user);
      } catch {
        throw reply.status(400);
      }
    }
  );

  fastify.patch(
    '/:id',
    {
      schema: {
        body: changeUserBodySchema,
        params: idParamSchema,
      },
    },
    async function (request, reply): Promise<UserEntity> {
      try {
        return await fastify.db.users.change(request.params.id, request.body);
      } catch {
        throw reply.status(400);
      }
    }
  );
};

export default plugin;
