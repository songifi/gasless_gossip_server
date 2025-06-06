// src/users/users.service.ts
import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    // Check if username or email already exists
    const existingUser = await this.usersRepository.findOne({
      where: [
        { username: createUserDto.username },
        { email: createUserDto.email }
      ]
    });

    if (existingUser) {
      if (existingUser.username === createUserDto.username) {
        throw new ConflictException('Username already exists');
      }
      if (existingUser.email === createUserDto.email) {
        throw new ConflictException('Email already exists');
      }
    }

    // Hash the password
    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(createUserDto.password, salt);

    // Create new user
    const newUser = this.usersRepository.create({
      ...createUserDto,
      password: hashedPassword,
    });

    return this.usersRepository.save(newUser);
  }

  async findAll(): Promise<User[]> {
    return this.usersRepository.find();
  }

  async findOne(id: string): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User with ID "${id}" not found`);
    }
    return user;
  }

  async findByUsername(username: string): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { username } });
    if (!user) {
      throw new NotFoundException(`User with username "${username}" not found`);
    }
    return user;
  }

  async findByEmail(email: string): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { email } });
    if (!user) {
      throw new NotFoundException(`User with email "${email}" not found`);
    }
    return user;
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(id);

    // Check if username update doesn't conflict
    if (updateUserDto.username && updateUserDto.username !== user.username) {
      const usernameExists = await this.usersRepository.findOne({ 
        where: { username: updateUserDto.username } 
      });
      if (usernameExists) {
        throw new ConflictException('Username already exists');
      }
    }

    // Check if email update doesn't conflict
    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const emailExists = await this.usersRepository.findOne({ 
        where: { email: updateUserDto.email } 
      });
      if (emailExists) {
        throw new ConflictException('Email already exists');
      }
    }
    

    // If updating password, hash it
    if (updateUserDto.password) {
      const salt = await bcrypt.genSalt();
      updateUserDto.password = await bcrypt.hash(updateUserDto.password, salt);
    }

    // Update and save the user
    Object.assign(user, updateUserDto);
    return this.usersRepository.save(user);
  }

  async remove(id: string): Promise<void> {
    const result = await this.usersRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`User with ID "${id}" not found`);
    }
  }

  async markEmailAsVerified(userId: string): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id: userId }});
    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.isEmailVerified = true;
    user.emailVerifiedAt = new Date();
    
    return this.usersRepository.save(user);
  }

  
  async validatePassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  async findById(id: string): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User with ID "${id}" not found`);
    }
    return user;
  }

  async setMfaSecret(userId: string, secret: string): Promise<User> {
    const user = await this.findById(userId);
    
    // Generate recovery codes
    const recoveryCodes = await this.generateRecoveryCodes();
    
    // Store MFA data
    user.mfaSecret = secret;
    user.isMfaEnabled = true;
    user.mfaEnabledAt = new Date();
    user.mfaRecoveryCodes = JSON.stringify(recoveryCodes);
    
    return this.usersRepository.save(user);
  }

  async disableMfa(userId: string): Promise<User> {
    const user = await this.findById(userId);
    
    user.mfaSecret = "";
    user.isMfaEnabled = false;
    user.mfaEnabledAt = undefined;
    user.mfaRecoveryCodes = "";
    user.mfaRequired = false;
    
    return this.usersRepository.save(user);
  }

  async verifyMfaToken(userId: string, token: string): Promise<boolean> {
    const user = await this.findById(userId);
    if (!user.isMfaEnabled) {
      throw new BadRequestException('MFA not enabled for this user');
    }
    
    // Implement token verification logic here
    return true; // Replace with actual verification
  }

  async updatePassword(userId: string, hashedPassword: string): Promise<User> {
    const user = await this.findById(userId);
    
    user.password = hashedPassword;
    user.passwordChangedAt = new Date();
    
    // Optionally invalidate all existing sessions
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    
    return this.usersRepository.save(user);
  }

  private async generateRecoveryCodes(): Promise<string[]> {
    const codes: string[] = [];
    for (let i = 0; i < 10; i++) {
      codes.push(this.generateRecoveryCode());
    }
    return codes;
  }

  private generateRecoveryCode(): string {
    return Math.random().toString(36).substr(2, 9).toUpperCase();
  }
}