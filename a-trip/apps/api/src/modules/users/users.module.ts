import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { UsersRepository } from './repositories/users.repository';

@Module({
  providers: [UsersService, UsersRepository],
  controllers: [UsersController],
  // The repository is exported too: sibling modules that only need to read a
  // user row should not have to go through the service's business rules.
  exports: [UsersService, UsersRepository],
})
export class UsersModule {}
