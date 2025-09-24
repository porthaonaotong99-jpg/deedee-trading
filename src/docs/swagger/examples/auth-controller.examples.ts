// Auth Controller request/response examples centralized

export const AuthCustomerRegisterRequestExample = {
  username: 'johndoe',
  email: 'john@example.com',
  password: 'CustStr0ng!1',
  first_name: 'John',
  last_name: 'Doe',
  address: '123 Market St',
};

export const AuthCustomerRegisterResponseExample = {
  is_error: false,
  code: 'SUCCESS',
  message: 'Customer registered',
  data: {
    id: '6d1f2e1a-b123-4c89-9d10-aaaaaaaaaaaa',
    username: 'johndoe',
    email: 'john@example.com',
    first_name: 'John',
    last_name: 'Doe',
    wallet_id: '0f9c2d34-7a1b-4c56-9a12-bbbbbbbbbbbb',
  },
  error: null,
  status_code: 200,
};

export const AuthLoginUserRequestExample = {
  username: 'admin',
  password: 'Admin@123',
};

export const AuthLoginUserResponseExample = {
  is_error: false,
  code: 'SUCCESS',
  message: 'Login successful',
  data: {
    access_token: 'xxx.yyy.zzz',
    token_type: 'bearer',
    expires_in: 3600,
    user: { id: 'uuid', username: 'admin', role: 'admin' },
  },
  error: null,
  status_code: 200,
};

export const AuthLoginCustomerRequestExample = {
  email: 'john@example.com',
  password: 'CustStr0ng!1',
};

export const AuthLoginCustomerResponseExample = {
  is_error: false,
  code: 'SUCCESS',
  message: 'Login successful',
  data: {
    access_token: 'xxx.yyy.zzz',
    token_type: 'bearer',
    expires_in: 3600,
    customer: {
      id: 'uuid',
      username: 'john_doe',
      email: 'john@example.com',
    },
  },
  error: null,
  status_code: 200,
};
