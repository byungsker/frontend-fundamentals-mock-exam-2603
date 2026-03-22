import Axios from 'axios';
const axios = Axios.create();

export const http = {
  get: function get<Response = unknown>(url: string) {
    return axios.get<Response>(url).then(res => res.data);
  },
  post: function post<Request = unknown, Response = unknown>(url: string, data?: Request) {
    return axios.post<Response>(url, { data }).then(res => res.data);
  },
  delete: function del<Response = unknown>(url: string) {
    return axios.delete<Response>(url).then(res => res.data);
  },
};
