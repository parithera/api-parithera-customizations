import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    ManyToMany,
    Relation,
    JoinTable
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { User } from 'src/entity/codeclarity/User';
import { File } from 'src/entity/codeclarity/File';
import { Project } from 'src/entity/codeclarity/Project';
import { Organization } from 'src/entity/codeclarity/Organization';

@Entity()
export class Sample {
    @PrimaryGeneratedColumn('uuid')
    @ApiProperty()
    @Expose()
    id: string;

    @Column('timestamptz')
    @ApiProperty()
    @Expose()
    added_on: Date;

    @Column()
    @ApiProperty()
    @Expose()
    name: string;

    @Column()
    @ApiProperty()
    @Expose()
    description: string;

    @Column('jsonb')
    @ApiProperty()
    @Expose()
    tags: Array<string>;

    @Column()
    @ApiProperty()
    @Expose()
    status: string;

    @Column()
    @ApiProperty()
    @Expose()
    condition: string;

    @Column({default:false})
    @ApiProperty()
    @Expose()
    public: boolean;

    @Column({default:""})
    @ApiProperty()
    @Expose()
    organism: string;

    @Column({default:""})
    @ApiProperty()
    @Expose()
    assay: string;

    @Column({default:0})
    @ApiProperty()
    @Expose()
    cells: number;

    @Column({default:""})
    @ApiProperty()
    @Expose()
    show: string;

    @Column({default:""})
    @ApiProperty()
    @Expose()
    download: string;

    // Foreign keys
    @ApiProperty()
    @Expose()
    @ManyToMany(() => Project)
    @JoinTable()
    projects: Relation<Project[]>;

    @ApiProperty()
    @Expose()
    @ManyToMany(() => Organization)
    @JoinTable()
    organizations: Relation<Organization[]>;

    @ApiProperty()
    @Expose()
    @ManyToMany(() => File)
    @JoinTable()
    files: Relation<File[]>;

    @ManyToMany(() => User)
    @JoinTable()
    @ApiProperty()
    @Expose()
    users: Relation<User[]>;
}
