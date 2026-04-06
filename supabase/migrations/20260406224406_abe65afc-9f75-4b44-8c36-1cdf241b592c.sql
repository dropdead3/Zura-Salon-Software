-- Fix security definer view - set to invoker mode
ALTER VIEW public.products_public SET (security_invoker = on);