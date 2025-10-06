import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

const WalletMeExample = {
  is_error: false,
  code: 'SUCCESS',
  message: 'Wallet fetched',
  data: {
    id: '2d5f8d10-aaaa-4e21-bbbb-333333333333',
    customer_id: '9b4e0e04-aaaa-4fa9-bbbb-222222222222',
    total_cash: 1500.0,
    total_recharge: 2000.0,
    created_at: '2025-10-05T15:10:00.000Z',
    updated_at: '2025-10-05T15:15:00.000Z',
  },
  error: null,
  status_code: 200,
};

const RequestTopupBodyExample = {
  amount: 5000,
  payment_slip: 'uploads/slips/2025/10/05/slip-abc123.png',
};

const RequestTopupResponseExample = {
  is_error: false,
  code: 'SUCCESS',
  message: 'Topup requested',
  data: {
    id: '44e1d3d2-ffff-4b55-cccc-999999999999',
    identify: 'RECHARGE',
    amount: 5000,
    payment_slip: 'uploads/slips/2025/10/05/slip-abc123.png',
    status: 'PENDING',
    customer_id: '9b4e0e04-aaaa-4fa9-bbbb-222222222222',
    created_at: '2025-10-05T15:20:00.000Z',
  },
  error: null,
  status_code: 200,
};

const ApproveTopupBodyExample = {
  adminId: 'c6c1a9c8-1234-4d7b-9f10-111111111111',
};
const ApproveTopupResponseExample = {
  is_error: false,
  code: 'SUCCESS',
  message: 'Topup approved',
  data: {
    wallet_id: '2d5f8d10-aaaa-4e21-bbbb-333333333333',
    new_balance: 6500.0,
    transfer_id: '44e1d3d2-ffff-4b55-cccc-999999999999',
  },
  error: null,
  status_code: 200,
};

const RejectTopupBodyExample = {
  adminId: 'c6c1a9c8-1234-4d7b-9f10-111111111111',
  reason: 'Slip unreadable',
};
const RejectTopupResponseExample = {
  is_error: false,
  code: 'SUCCESS',
  message: 'Topup rejected',
  data: {
    id: '44e1d3d2-ffff-4b55-cccc-999999999999',
    status: 'REJECTED',
    rejected_by: 'c6c1a9c8-1234-4d7b-9f10-111111111111',
  },
  error: null,
  status_code: 200,
};

export function buildWalletsDocument(app: INestApplication) {
  const config = new DocumentBuilder()
    .setTitle('Wallets API')
    .setDescription(
      'Endpoints: GET /wallets/me, POST /wallets/topup, POST /wallets/topup/{transferId}/approve, POST /wallets/topup/{transferId}/reject',
    )
    .setVersion('1.0')
    .addTag('wallets')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config, {
    include: [],
    deepScanRoutes: true,
  });

  // Patch examples into generated paths if they exist
  if (document.paths['/wallets/me']?.get) {
    document.paths['/wallets/me'].get.responses = {
      ...document.paths['/wallets/me'].get.responses,
      200: {
        description: 'Wallet fetched',
        content: {
          'application/json': {
            schema: { type: 'object' },
            example: WalletMeExample,
          },
        },
      },
    };
  }
  if (document.paths['/wallets/topup']?.post) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    document.paths['/wallets/topup'].post.requestBody = {
      required: true,
      content: {
        'application/json': {
          schema: { type: 'object' },
          example: RequestTopupBodyExample,
        },
      },
    } as any;
    document.paths['/wallets/topup'].post.responses = {
      ...document.paths['/wallets/topup'].post.responses,
      200: {
        description: 'Topup requested',
        content: {
          'application/json': {
            schema: { type: 'object' },
            example: RequestTopupResponseExample,
          },
        },
      },
    };
  }
  if (document.paths['/wallets/topup/{transferId}/approve']?.post) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    document.paths['/wallets/topup/{transferId}/approve'].post.requestBody = {
      required: true,
      content: {
        'application/json': {
          schema: { type: 'object' },
          example: ApproveTopupBodyExample,
        },
      },
    } as any;
    document.paths['/wallets/topup/{transferId}/approve'].post.responses = {
      ...document.paths['/wallets/topup/{transferId}/approve'].post.responses,
      200: {
        description: 'Topup approved',
        content: {
          'application/json': {
            schema: { type: 'object' },
            example: ApproveTopupResponseExample,
          },
        },
      },
    };
  }
  if (document.paths['/wallets/topup/{transferId}/reject']?.post) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    document.paths['/wallets/topup/{transferId}/reject'].post.requestBody = {
      required: true,
      content: {
        'application/json': {
          schema: { type: 'object' },
          example: RejectTopupBodyExample,
        },
      },
    } as any;
    document.paths['/wallets/topup/{transferId}/reject'].post.responses = {
      ...document.paths['/wallets/topup/{transferId}/reject'].post.responses,
      200: {
        description: 'Topup rejected',
        content: {
          'application/json': {
            schema: { type: 'object' },
            example: RejectTopupResponseExample,
          },
        },
      },
    };
  }

  return document;
}
