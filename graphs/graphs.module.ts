import { Module } from '@nestjs/common';
import { GraphController } from './graphs.controller';
import { Result } from 'src/entity/codeclarity/Result';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
    imports: [TypeOrmModule.forFeature([Result], 'codeclarity')],
    providers: [],
    controllers: [GraphController]
})
export class GraphModule {}
