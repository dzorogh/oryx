const LEGACY_PREFIXES = ["/logistics", "/store/logistics"] as const;

const RELEASES_DESTINATION = "/store/oms/reservations?operation=release";

const redirect = (source: string, destination: string) => ({
  source,
  destination,
  permanent: false as const,
});

const forEachLegacyPrefix = (rule: (prefix: string) => ReturnType<typeof redirect>[]) =>
  LEGACY_PREFIXES.flatMap(rule);

/** Old order and directory addresses. Specific rules come before the catch-all. */
export const STORE_LEGACY_REDIRECTS = [
  ...forEachLegacyPrefix((prefix) => [
    redirect(`${prefix}/products`, "/store/pim/products"),
    redirect(`${prefix}/products/:id/:path*`, "/store/pim/variants/:id"),
    redirect(`${prefix}/products/:id`, "/store/pim/variants/:id"),
    redirect(`${prefix}/releases`, RELEASES_DESTINATION),
    redirect(`${prefix}/releases/:path*`, RELEASES_DESTINATION),
    ...(["warehouses", "regions", "plants"] as const).flatMap((directory) => [
      redirect(`${prefix}/${directory}`, `/store/${directory}`),
      redirect(`${prefix}/${directory}/:path*`, `/store/${directory}/:path*`),
    ]),
  ]),
  ...forEachLegacyPrefix((prefix) => [
    redirect(prefix, "/store/oms/stock"),
    redirect(`${prefix}/:path*`, "/store/oms/:path*"),
  ]),
];
