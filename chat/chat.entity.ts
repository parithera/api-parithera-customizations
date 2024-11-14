import { Column, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn, Relation } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { Project } from 'src/entity/codeclarity/Project';

@Entity()
export class Chat {
    @PrimaryGeneratedColumn('uuid')
    @ApiProperty()
    @Expose()
    id: string;

    @ApiProperty()
    @Expose()
    @Column('jsonb')
    messages: Message[];

    @ApiProperty()
    @Expose()
    @OneToOne(() => Project)
    @JoinColumn()
    project: Relation<Project>;
}

export class Message {
    @ApiProperty()
    @Expose()
    request: string;

    @ApiProperty()
    @Expose()
    response: string;

    @ApiProperty()
    @Expose()
    image: string;

    @ApiProperty()
    @Expose()
    timestamp: Date;
}
