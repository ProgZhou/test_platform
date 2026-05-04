import axios from "axios";
import type { ApiResponse } from "../types";

const request = axios.create({
  baseURL: "/api/v1",
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

request.interceptors.response.use(
  (response) => {
    const data = response.data as ApiResponse<any>;
    if (data.code !== 0) {
      return Promise.reject(new Error(data.message || "Request failed"));
    }
    return response;
  },
  (error) => {
    return Promise.reject(error);
  },
);

export default request;
