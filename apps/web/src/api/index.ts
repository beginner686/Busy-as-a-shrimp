import { createMatchApi } from "./match-api";
import { createResourceApi } from "./resource-api";
import { createUserApi } from "./user-api";
import { getWebClient } from "./web-client";

export function getUserApi() {
  return createUserApi(getWebClient());
}

export function getResourceApi() {
  return createResourceApi(getWebClient());
}

export function getMatchApi() {
  return createMatchApi(getWebClient());
}
