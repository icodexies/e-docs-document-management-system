export function mapPdfError(error) {
  if (error?.name === "PasswordException") {
    return new Error(
      "This PDF is password-protected. Remove the password and try again.",
    );
  }
  if (error?.name === "InvalidPDFException") {
    return new Error("This file isn't a valid PDF.");
  }
  return new Error("Couldn't read this PDF. Try another file.");
}
