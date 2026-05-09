import { Group, Menu, Text, UnstyledButton } from "@mantine/core";
import { IconChevronDown } from "@tabler/icons-react";
import React, { useMemo } from "react";
import { getHeaderNavMenuGroups } from "@/lib/config.ts";
import classes from "./app-header.module.css";

export function HeaderExternalMenus() {
  const groups = useMemo(() => getHeaderNavMenuGroups(), []);

  if (groups.length === 0) {
    return null;
  }

  return (
    <>
      {groups.map((group, i) => (
        <Menu key={i} position="bottom-start" withinPortal>
          <Menu.Target>
            <UnstyledButton
              className={classes.link}
              aria-haspopup="menu"
              aria-label={group.title}
            >
              <Group gap={4} wrap="nowrap">
                <Text span size="sm" fw={500}>
                  {group.title}
                </Text>
                <IconChevronDown size={14} stroke={2} aria-hidden />
              </Group>
            </UnstyledButton>
          </Menu.Target>
          <Menu.Dropdown>
            {group.items.map((item, j) => (
              <Menu.Item
                key={j}
                component="a"
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                {item.label}
              </Menu.Item>
            ))}
          </Menu.Dropdown>
        </Menu>
      ))}
    </>
  );
}
