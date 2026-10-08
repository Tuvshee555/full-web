export function saveAuth(data: {
  token: string;
  user: { email: string; id: string };
}) {
  localStorage.setItem("token", data.token);
  localStorage.setItem("email", data.user.email);
  localStorage.setItem("userId", data.user.id);

  // console.log("SAVED AUTH:", {
  //   token: data.token,
  //   email: data.user.email,
  //   userId: data.user.id,
  // });
}
