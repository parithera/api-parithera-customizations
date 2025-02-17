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
    code: string;

    @ApiProperty()
    @Expose()
    @Column('jsonb')
    followup: string[]
    
    @ApiProperty()
    @Expose()
    text: string;
    
    @ApiProperty()
    @Expose()
    @Column('jsonb')
    json: object;
    
    @ApiProperty()
    @Expose()
    image: string;
    
    @ApiProperty()
    @Expose()
    agent: string;
    
    @ApiProperty()
    @Expose()
    error: string;

    @ApiProperty()
    @Expose()
    status: string;

    @ApiProperty()
    @Expose()
    timestamp: Date;
}
