import { customerAuthService } from "../services/customerAuthService.js";
import { customerRepository } from "../repositories/customerRepository.js";
import {
  CUSTOMER_COOKIE,
  customerCookieOptions,
} from "../middlewares/customerSecurity.js";

const sendSession = (res, result, status = 200) => {
  res.cookie(CUSTOMER_COOKIE, result.token, customerCookieOptions());
  res
    .status(status)
    .json({ data: { user: result.user, csrfToken: result.csrf } });
};
export async function register(req, res) {
  sendSession(res, await customerAuthService.register(req.validated.body), 201);
}
export async function login(req, res) {
  sendSession(res, await customerAuthService.login(req.validated.body));
}
export async function logout(req, res) {
  await customerAuthService.logout(req.customerToken);
  res.clearCookie(CUSTOMER_COOKIE, {
    ...customerCookieOptions(),
    maxAge: undefined,
  });
  res.status(204).end();
}
export async function me(req, res) {
  res.json({
    data: {
      profile: await customerRepository.profile(req.customer.cliente_id),
      csrfToken: await customerAuthService.refreshCsrf(req.customer),
    },
  });
}
export async function profile(req, res) {
  res.json({
    data: await customerRepository.updateProfile(
      req.customer.cliente_id,
      req.validated.body,
    ),
  });
}
export async function changePassword(req, res) {
  await customerAuthService.changePassword(
    req.customer.cliente_id,
    req.validated.body.currentPassword,
    req.validated.body.newPassword,
  );
  res.clearCookie(CUSTOMER_COOKIE, {
    ...customerCookieOptions(),
    maxAge: undefined,
  });
  res.status(204).end();
}
export async function forgot(req, res) {
  res
    .status(202)
    .json({ data: await customerAuthService.forgot(req.validated.body.email) });
}
export async function reset(req, res) {
  res.json({
    data: await customerAuthService.reset(
      req.validated.body.token,
      req.validated.body.password,
    ),
  });
}
export async function orders(req, res) {
  res.json({ data: await customerRepository.orders(req.customer.cliente_id) });
}
export async function addAddress(req, res) {
  res
    .status(201)
    .json({
      data: await customerRepository.addAddress(
        req.customer.cliente_id,
        req.validated.body,
      ),
    });
}
export async function updateAddress(req, res) {
  res.json({
    data: await customerRepository.updateAddress(
      req.customer.cliente_id,
      req.validated.params.id,
      req.validated.body,
    ),
  });
}
export async function deleteAddress(req, res) {
  await customerRepository.deleteAddress(
    req.customer.cliente_id,
    req.validated.params.id,
  );
  res.status(204).end();
}
