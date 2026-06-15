/** 携带建议 HTTP 状态码 */
export class TemplateInstanceError extends Error {
  readonly status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = "TemplateInstanceError";
    this.status = status;
  }
}
