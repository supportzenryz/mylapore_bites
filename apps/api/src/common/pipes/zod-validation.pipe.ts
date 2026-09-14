import { PipeTransform, Injectable, ArgumentMetadata } from "@nestjs/common";
import { ZodSchema } from "zod";
import { ErrorCode } from "@mb/contracts";
import { DomainError } from "../errors/domain.error.js";

/**
 * Validation happens at the boundary with the SAME schema the storefront
 * uses, so a request the client can build is a request the API accepts.
 */
@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: ZodSchema) {}

  transform(value: unknown, _metadata: ArgumentMetadata): unknown {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new DomainError(ErrorCode.VALIDATION_FAILED, "Please check the highlighted fields.", {
        details: {
          fields: result.error.issues.map((i) => ({
            path: i.path.join("."),
            message: i.message,
          })),
        },
      });
    }
    return result.data;
  }
}

export const zodPipe = (schema: ZodSchema): ZodValidationPipe => new ZodValidationPipe(schema);
