import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  Authorized,
  OrgProtected,
} from '@src/common/decorators/auth.decorator';
import { CustomerService } from './customer.service';
import {
  CreateCustomerDto,
  CustomerDetailDto,
  CustomerDto,
  GetCustomersQueryDto,
  GetCustomersResponseDto,
  UpdateCustomerDto,
} from './customer.dto';
import {
  type CurrentOrg,
  CurrentOrganization,
} from '@src/common/decorators/current-org.decorator';
import {
  ApiDoc,
  appendToPaginationQuery,
} from '@src/common/swagger/api-doc.decorator';

@ApiTags('customers')
@Controller('customers')
@OrgProtected()
export class CustomerController {
  constructor(private readonly customerService: CustomerService) {}

  @ApiDoc({
    summary: 'Get customers',
    description: 'List customers for the active organization with pagination.',
    ok: GetCustomersResponseDto,
    queries: appendToPaginationQuery([
      {
        name: 'search',
        description: 'Search by name, email, or phone',
        type: String,
      },
    ]),
  })
  @Get()
  getCustomers(
    @CurrentOrganization() org: CurrentOrg,
    @Query() query: GetCustomersQueryDto,
  ) {
    return this.customerService.getCustomers(org.organizationId, query);
  }

  @ApiDoc({
    summary: 'Get individual customer',
    ok: CustomerDetailDto,
    notFoundDesc: 'Customer not found',
    params: [{ name: 'id', description: 'Customer ID', type: String }],
  })
  @Get(':id')
  getCustomerById(
    @CurrentOrganization() org: CurrentOrg,
    @Param('id') id: string,
  ) {
    return this.customerService.getCustomerById({
      organizationId: org.organizationId,
      customerId: id,
    });
  }

  @Post()
  @ApiDoc({
    summary: 'Create customer',
    body: CreateCustomerDto,
    created: CustomerDto,
    conflictDesc: 'Duplicate customer or constraint violation',
  })
  @Authorized('ADMIN', 'MANAGER')
  createCustomer(
    @Body() customerData: CreateCustomerDto,
    @CurrentOrganization() org: CurrentOrg,
  ) {
    return this.customerService.createCustomer({
      organizationId: org.organizationId,
      customerData,
    });
  }

  @Patch(':id')
  @ApiDoc({
    summary: 'Update customer',
    body: UpdateCustomerDto,
    ok: CustomerDto,
    notFoundDesc: 'Customer not found',
    params: [{ name: 'id', description: 'Customer ID', type: String }],
  })
  @Authorized('ADMIN', 'MANAGER')
  updateCustomer(
    @Param('id') id: string,
    @Body() customerData: UpdateCustomerDto,
    @CurrentOrganization() org: CurrentOrg,
  ) {
    return this.customerService.updateCustomer({
      organizationId: org.organizationId,
      customerId: id,
      customerData,
    });
  }

  @Delete(':id')
  @ApiDoc({
    summary: 'Delete customer',
    ok: CustomerDto,
    notFoundDesc: 'Customer not found',
    params: [{ name: 'id', description: 'Customer ID', type: String }],
  })
  @Authorized('ADMIN')
  deleteCustomer(
    @Param('id') id: string,
    @Request() @CurrentOrganization() org: CurrentOrg,
  ) {
    return this.customerService.deleteCustomer({
      organizationId: org.organizationId,
      customerId: id,
    });
  }
}
