
The user is right — there's already a "Stylist Service Assignments" configurator that controls which services each stylist is qualified to perform. We should wire the tooltip from that existing system instead of the new `stylist_service_exclusions` table I just created.

Let me investigate what table/hook backs that existing configurator.
