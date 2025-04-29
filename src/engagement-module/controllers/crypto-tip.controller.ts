// controllers/crypto-tip.controller.ts
import {
    Controller,
    Get,
    Post,
    Body,
    Param,
    UseGuards,
    Request,
    Query,
  } from "@nestjs/common";
  import { CryptoTipService } from "../services/crypto-tip.service";
  import {
    CreateCryptoTipDto,
    CryptoTipResponseDto,
  } from "../dto/crypto-tip.dto";
  import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
  import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth,
  } from "@nestjs/swagger";
  
  @ApiTags("crypto-tips")
  @Controller("crypto-tips")
  export class CryptoTipController {
    constructor(private readonly cryptoTipService: CryptoTipService) {}
  
    @Post()
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: "Create a new crypto tip" })
    @ApiResponse({
      status: 201,
      description: "Crypto tip created successfully",
      type: CryptoTipResponseDto,
    })
    async create(
      @Request() req,
      @Body() createCryptoTipDto: CreateCryptoTipDto
    ): Promise<CryptoTipResponseDto> {
      return this.cryptoTipService.create(req.user.id, createCryptoTipDto);
    }
  
    @Get("content/:contentType/:contentId")
    @ApiOperation({ summary: "Get all tips for content" })
    @ApiResponse({
      status: 200,
      description: "Returns all tips",
      type: [CryptoTipResponseDto],
    })
    async findAllForContent(
      @Param("contentType") contentType: string,
      @Param("contentId") contentId: string
    ): Promise<CryptoTipResponseDto[]> {
      return this.cryptoTipService.findAll(contentId, contentType);
    }
  
    @Get("user")
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: "Get all tips by current user" })
    @ApiResponse({
      status: 200,
      description: "Returns user tips",
      type: [CryptoTipResponseDto],
    })
    async findByUser(
      @Request() req,
      @Query("limit") limit?: number,
      @Query("offset") offset?: number
    ): Promise<CryptoTipResponseDto[]> {
      return this.cryptoTipService.findByUser(req.user.id, limit, offset);
    }
  
    @Get(":id")
    @ApiOperation({ summary: "Get a specific tip" })
    @ApiResponse({
      status: 200,
      description: "Returns the tip",
      type: CryptoTipResponseDto,
    })
    async findOne(@Param("id") id: string): Promise<CryptoTipResponseDto> {
      return this.cryptoTipService.findOne(id);
    }
  }
  