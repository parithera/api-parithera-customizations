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
import { Project } from 'src/base_modules/projects/project.entity';
import { Organization } from 'src/base_modules/organizations/organization.entity';
import { User } from 'src/base_modules/users/users.entity';
import { File } from 'src/base_modules/file/file.entity';

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
