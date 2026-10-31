export function useLogParams(search?: string) {
  const params = new URLSearchParams(search ?? window.location.search);
  const stackName = params.get("stack") || "";
  const servicesParam = params.get("services");
  const services = servicesParam ? servicesParam.split(",").filter(Boolean) : [];
  return { stackName, services };
}
