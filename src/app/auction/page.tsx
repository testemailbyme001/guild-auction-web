"use client";

import { useMemo, useState } from "react";
import Image, { StaticImageData } from "next/image";
import { Controller, useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Button,
  Input,
  Modal,
  Table,
  TextArea,
  Toast,
  toast,
} from "@heroui/react";
import Plus from "@gravity-ui/icons/Plus";
import { Check } from "@gravity-ui/icons";

import timespace from "@/assets/timespace.png";
import fragment from "@/assets/fragment.png";
import puppet from "@/assets/puppet.png";
import white from "@/assets/white.png";

type AuctionItemKey =
  | "puppetFragmentOptAlbum"
  | "illusionCardFragment"
  | "timeSpaceOptChest"
  | "lightDarkOptChest";

type CreateAuctionStep = 1 | 2;

type AuctionItem = {
  key: AuctionItemKey;
  name: string;
  image: StaticImageData;
  date: string;
  page: number;
  order: number;
  user: string;
};

type GroupedAuctionItem = {
  id: string;
  key: AuctionItemKey;
  name: string;
  image: StaticImageData;
  date: string;
  page: number;
  user: string;
  orderText: string;
};

type AuctionConfigItem = {
  key: AuctionItemKey;
  name: string;
  defaultQuantity: number;
  image: StaticImageData;
};

const numberSchema = z
  .number()
  .int("กรุณากรอกเป็นจำนวนเต็ม")
  .min(0, "ห้ามน้อยกว่า 0");

const auctionFormSchema = z.object({
  quantities: z.object({
    puppetFragmentOptAlbum: numberSchema,
    illusionCardFragment: numberSchema,
    timeSpaceOptChest: numberSchema,
    lightDarkOptChest: numberSchema,
  }),
  capacities: z.object({
    puppetFragmentOptAlbum: numberSchema,
    illusionCardFragment: numberSchema,
    timeSpaceOptChest: numberSchema,
    lightDarkOptChest: numberSchema,
  }),
  winnerTexts: z.object({
    puppetFragmentOptAlbum: z.string(),
    illusionCardFragment: z.string(),
    timeSpaceOptChest: z.string(),
    lightDarkOptChest: z.string(),
  }),
});

type AuctionFormValues = z.infer<typeof auctionFormSchema>;

const auctionItems: AuctionConfigItem[] = [
  {
    key: "puppetFragmentOptAlbum",
    name: "Puppet Fragment Opt. Album",
    defaultQuantity: 0,
    image: puppet,
  },
  {
    key: "illusionCardFragment",
    name: "Illusion Card Fragment",
    defaultQuantity: 0,
    image: fragment,
  },
  {
    key: "lightDarkOptChest",
    name: "Light-Dark Opt. Chest",
    defaultQuantity: 0,
    image: white,
  },
  {
    key: "timeSpaceOptChest",
    name: "Time-Space Opt. Chest",
    defaultQuantity: 0,
    image: timespace,
  },
];

const defaultFormValues: AuctionFormValues = {
  quantities: {
    puppetFragmentOptAlbum: 0,
    illusionCardFragment: 0,
    timeSpaceOptChest: 0,
    lightDarkOptChest: 0,
  },
  capacities: {
    puppetFragmentOptAlbum: 0,
    illusionCardFragment: 0,
    timeSpaceOptChest: 0,
    lightDarkOptChest: 0,
  },
  winnerTexts: {
    puppetFragmentOptAlbum: "",
    illusionCardFragment: "",
    timeSpaceOptChest: "",
    lightDarkOptChest: "",
  },
};

const getTodayText = () => {
  return new Intl.DateTimeFormat("en-GB").format(new Date());
};
const getOrderText = (orders: number[]) => {
  if (orders.length === 0) {
    return "";
  }

  const sortedOrders = [...orders].sort((a, b) => a - b);
  const firstOrder = sortedOrders[0];
  const lastOrder = sortedOrders[sortedOrders.length - 1];

  if (firstOrder === lastOrder) {
    return String(firstOrder);
  }

  return `${firstOrder}-${lastOrder}`;
};

const groupAuctionRows = (rows: AuctionItem[]): GroupedAuctionItem[] => {
  const groups = new Map<string, GroupedAuctionItem & { orders: number[] }>();

  rows.forEach((row) => {
    const groupKey = [row.date, row.key, row.name, row.user, row.page].join(
      "|",
    );

    const currentGroup = groups.get(groupKey);

    if (currentGroup) {
      currentGroup.orders.push(row.order);
      currentGroup.orderText = getOrderText(currentGroup.orders);
      return;
    }

    groups.set(groupKey, {
      id: groupKey,
      key: row.key,
      name: row.name,
      image: row.image,
      date: row.date,
      page: row.page,
      user: row.user,
      orders: [row.order],
      orderText: String(row.order),
    });
  });

  return Array.from(groups.values()).map(({ orders, ...group }) => group);
};

const getAuctionRowClassName = (key: AuctionItemKey) => {
  switch (key) {
    case "puppetFragmentOptAlbum":
      return "bg-purple-50";

    case "illusionCardFragment":
      return "bg-yellow-50";

    case "lightDarkOptChest":
      return "bg-pink-50";

    case "timeSpaceOptChest":
      return "bg-blue-50";

    default:
      return "";
  }
};

const getCaptureItemTheme = (key: AuctionItemKey) => {
  switch (key) {
    case "puppetFragmentOptAlbum":
      return {
        background: "#faf5ff", // purple-50
        border: "#e9d5ff", // purple-200
      };

    case "illusionCardFragment":
      return {
        background: "#fefce8", // yellow-50
        border: "#fef08a", // yellow-200
      };

    case "lightDarkOptChest":
      return {
        background: "#fdf2f8", // pink-50
        border: "#fbcfe8", // pink-200
      };

    case "timeSpaceOptChest":
      return {
        background: "#eff6ff", // blue-50
        border: "#bfdbfe", // blue-200
      };

    default:
      return {
        background: "#ffffff",
        border: "#e5e7eb",
      };
  }
};

const escapeHtml = (value: string) => {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
};

export default function Auction() {
  const [isOpenCreateModal, setIsOpenCreateModal] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);

  const [createAuctionStep, setCreateAuctionStep] =
    useState<CreateAuctionStep>(1);
  const [auctionData, setAuctionData] = useState<AuctionItem[]>([]);

  const { control, handleSubmit, reset, trigger } = useForm<AuctionFormValues>({
    resolver: zodResolver(auctionFormSchema),
    defaultValues: defaultFormValues,
  });

  const watchedWinnerTexts = useWatch({
    control,
    name: "winnerTexts",
  });

  const groupedAuctionData = useMemo(() => {
    return groupAuctionRows(auctionData);
  }, [auctionData]);

  const splitNamesByRow = (text: string) => {
    return text
      .split(/\r?\n/)
      .map((name) => name.trim())
      .filter(Boolean);
  };

  const handleOpenCreateModal = () => {
    setCreateAuctionStep(1);
    setIsOpenCreateModal(true);
  };

  const handleOpenChangeCreateModal = (open: boolean) => {
    setIsOpenCreateModal(open);

    if (!open) {
      setCreateAuctionStep(1);
    }
  };

  const handleNextStep = async () => {
    const isValid = await trigger(["quantities", "capacities"]);

    if (!isValid) {
      return;
    }

    setCreateAuctionStep(2);
  };

  const handleBackStep = () => {
    setCreateAuctionStep(1);
  };

  const handleCapturePage = async () => {
    if (auctionData.length === 0 || isCapturing) {
      return;
    }

    try {
      setIsCapturing(true);

      const html2canvas = (await import("html2canvas-pro")).default;

      const html = document.documentElement;
      const body = document.body;

      const canvas = await html2canvas(body, {
        backgroundColor: "#f9fafb",
        scale: 2,
        useCORS: true,
        windowWidth: html.scrollWidth,
        windowHeight: html.scrollHeight,
        width: html.scrollWidth,
        height: html.scrollHeight,
        scrollX: -window.scrollX,
        scrollY: -window.scrollY,
      });

      const imageUrl = canvas.toDataURL("image/png");

      const link = document.createElement("a");
      link.href = imageUrl;
      link.download = `guild-auction-${new Date()
        .toISOString()
        .slice(0, 10)}.png`;

      link.click();

      toast.success("Capture success", {
        description: "บันทึกรูป Guild Auction เรียบร้อยแล้ว",
        timeout: 3000,
      });
    } catch (error) {
      toast.danger("Capture failed", {
        description: "ไม่สามารถ capture หน้าจอได้",
        timeout: 3000,
      });
      console.error("Capture failed:", error);
    } finally {
      setIsCapturing(false);
    }
  };

  const handleCaptureAuctionItem = async (auctionItem: AuctionConfigItem) => {
    if (isCapturing) {
      return;
    }

    const itemRows = auctionData.filter((row) => row.key === auctionItem.key);
    const groupedRows = groupAuctionRows(itemRows);

    if (groupedRows.length === 0) {
      toast.danger("No data", {
        description: `ยังไม่มีข้อมูลของ ${auctionItem.name}`,
        timeout: 3000,
      });

      return;
    }

    try {
      setIsCapturing(true);

      const html2canvas = (await import("html2canvas-pro")).default;
      const theme = getCaptureItemTheme(auctionItem.key);
      const currentFont = getComputedStyle(document.body).fontFamily;

      await document.fonts.ready;

      const captureElement = document.createElement("div");

      captureElement.style.position = "fixed";
      captureElement.style.left = "-9999px";
      captureElement.style.top = "0";
      captureElement.style.width = "1100px";
      captureElement.style.background = "#f9fafb";
      captureElement.style.padding = "24px";
      captureElement.style.fontFamily = currentFont;

      captureElement.innerHTML = `
      <div style="
        background: white;
        border-radius: 20px;
        overflow: hidden;
        border: 1px solid #e5e7eb;
        box-shadow: 0 10px 30px rgba(0,0,0,0.12);
        font-family: ${currentFont};
      ">
        <div style="
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 20px 24px;
          border-bottom: 1px solid #e5e7eb;
          background: #ffffff;
          font-family: ${currentFont};
        ">
          <img
            src="${auctionItem.image.src}"
            alt="${escapeHtml(auctionItem.name)}"
            style="
              width: 64px;
              height: 64px;
              object-fit: contain;
              border-radius: 12px;
            "
          />

          <div>
            <div style="
              font-size: 22px;
              font-weight: 700;
              color: #111827;
              font-family: ${currentFont};
            ">
              ${escapeHtml(auctionItem.name)}
            </div>

            <div style="
              margin-top: 4px;
              font-size: 14px;
              color: #6b7280;
              font-family: ${currentFont};
            ">
              Guild Auction Capture
            </div>
          </div>
        </div>

        <div>
          ${groupedRows
            .map(
              (row) => `
                <div style="
                  display: grid;
                  grid-template-columns: 160px 1fr 180px 150px 150px;
                  align-items: center;
                  gap: 16px;
                  padding: 18px 24px;
                  border-bottom: 1px solid ${theme.border};
                  background: ${theme.background};
                  color: #111827;
                  font-size: 18px;
                  font-family: ${currentFont};
                ">
                  <div style="font-weight: 500; font-family: ${currentFont};">
                    ${escapeHtml(row.date)}
                  </div>

                  <div style="
                    display: flex;
                    align-items: center;
                    gap: 14px;
                    font-weight: 600;
                    font-family: ${currentFont};
                  ">
                    <img
                      src="${row.image.src}"
                      alt="${escapeHtml(row.name)}"
                      style="
                        width: 56px;
                        height: 56px;
                        object-fit: contain;
                        border-radius: 10px;
                      "
                    />

                    <span>${escapeHtml(row.name)}</span>
                  </div>

                  <div style="
                    text-align: center;
                    font-weight: 600;
                    font-family: ${currentFont};
                  ">
                    ${escapeHtml(row.user)}
                  </div>

                  <div style="text-align: center; font-family: ${currentFont};">
                    หน้าที่ ${row.page}
                  </div>

                  <div style="text-align: center; font-family: ${currentFont};">
                    ลำดับที่ ${escapeHtml(row.orderText)}
                  </div>
                </div>
              `,
            )
            .join("")}
        </div>
      </div>
    `;

      document.body.appendChild(captureElement);

      const canvas = await html2canvas(captureElement, {
        backgroundColor: "#f9fafb",
        scale: 1.5,
        useCORS: true,
      });

      document.body.removeChild(captureElement);

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (!blob) {
            reject(new Error("Cannot create image blob"));
            return;
          }

          resolve(blob);
        }, "image/png");
      });

      if (!navigator.clipboard || !window.ClipboardItem) {
        throw new Error("Clipboard image copy is not supported");
      }

      await navigator.clipboard.write([
        new ClipboardItem({
          "image/png": blob,
        }),
      ]);

      toast.success("Capture copied", {
        description: `คัดลอกรูป ${auctionItem.name} แล้ว`,
        timeout: 3000,
      });
    } catch (error) {
      toast.danger("Capture failed", {
        description: `ไม่สามารถ capture ${auctionItem.name} ได้`,
        timeout: 3000,
      });

      console.error("Capture item failed:", error);
    } finally {
      setIsCapturing(false);
    }
  };
  const handleCreateAuction = (values: AuctionFormValues) => {
    const today = getTodayText();
    const generatedRows: AuctionItem[] = [];

    auctionItems.forEach((item) => {
      const quantity = values.quantities[item.key];
      const capacity = values.capacities[item.key];
      const Members = splitNamesByRow(values.winnerTexts[item.key]);

      for (let index = 0; index < quantity; index++) {
        const winnerIndex = capacity > 0 ? Math.floor(index / capacity) : -1;
        const user = Members[winnerIndex] ?? "-";

        generatedRows.push({
          key: item.key,
          name: item.name,
          image: item.image,
          date: today,
          user,
          page: 0,
          order: 0,
        });
      }
    });

    const rowsWithPageAndOrder = generatedRows.map((row, index) => ({
      ...row,
      page: Math.floor(index / 4) + 1,
      order: (index % 4) + 1,
    }));

    toast.success("Create auction success", {
      description: `สร้างรายการทั้งหมด ${rowsWithPageAndOrder.length} รายการแล้ว`,
      timeout: 3000,
    });

    setAuctionData(rowsWithPageAndOrder);
    setIsOpenCreateModal(false);
    setCreateAuctionStep(1);
    reset(defaultFormValues);
  };

  return (
    <>
      <Toast.Provider placement="top end" />

      <div className="min-h-screen w-full bg-gray-50 px-20 py-10">
        <div className="flex w-full flex-col items-center gap-6">
          <h1 className="text-xl font-semibold">GUILD AUCTION MANAGEMENT</h1>

          <div className="flex w-full items-center justify-between">
            <h2 className="text-lg font-medium">Guild Auction</h2>

            <Button onPress={handleOpenCreateModal}>
              <Plus width={20} height={20} />
              Create
            </Button>
          </div>

          <div className="flex w-full items-end justify-end gap-2">
            {auctionItems.map((item) => {
              const hasItemData = auctionData.some(
                (row) => row.key === item.key,
              );

              return (
                <Button
                  key={item.key}
                  variant="outline"
                  isDisabled={!hasItemData || isCapturing}
                  className="flex flex-wrap items-center gap-2 h-18 px-3 text-sm"
                  onPress={() => handleCaptureAuctionItem(item)}
                >
                  <Image
                    src={item.image}
                    alt={item.name}
                    width={64}
                    height={64}
                    className="rounded object-contain"
                  />

                  <span className="">Capture</span>
                </Button>
              );
            })}
          </div>

          <Table>
            <Table.ScrollContainer>
              <Table.Content aria-label="Guild auction table">
                <Table.Header>
                  <Table.Column id="date" className="text-center">
                    DATE
                  </Table.Column>

                  <Table.Column id="item" isRowHeader>
                    AUCTIONED ITEM
                  </Table.Column>

                  <Table.Column id="user" className="text-center">
                    NAME
                  </Table.Column>

                  <Table.Column id="page" className="text-center">
                    PAGE
                  </Table.Column>

                  <Table.Column id="order" className="text-center">
                    ORDER
                  </Table.Column>
                </Table.Header>

                <Table.Body
                  renderEmptyState={() => (
                    <div className="flex min-h-100 items-center justify-center text-muted">
                      No auction data available.
                    </div>
                  )}
                >
                  {groupedAuctionData.map((item) => {
                    const rowClassName = getAuctionRowClassName(item.key);

                    return (
                      <Table.Row
                        id={`${item.page}-${item.orderText}`}
                        key={`${item.page}-${item.orderText}`}
                        className={rowClassName}
                      >
                        <Table.Cell className={`text-center ${rowClassName}`}>
                          {item.date}
                        </Table.Cell>

                        <Table.Cell className={rowClassName}>
                          <div className="flex items-center gap-3">
                            <Image
                              src={item.image}
                              alt={item.name}
                              width={60}
                              height={60}
                              className="rounded object-contain"
                            />

                            <span>{item.name}</span>
                          </div>
                        </Table.Cell>

                        <Table.Cell className={`text-center ${rowClassName}`}>
                          {item.user}
                        </Table.Cell>

                        <Table.Cell className={`text-center ${rowClassName}`}>
                          หน้าที่ {item.page}
                        </Table.Cell>

                        <Table.Cell className={`text-center ${rowClassName}`}>
                          ลำดับที่ {item.orderText}
                        </Table.Cell>
                      </Table.Row>
                    );
                  })}
                </Table.Body>
              </Table.Content>
            </Table.ScrollContainer>
          </Table>
        </div>
      </div>

      <Modal
        isOpen={isOpenCreateModal}
        onOpenChange={handleOpenChangeCreateModal}
      >
        <Modal.Backdrop isDismissable={false}>
          <Modal.Container size="lg" placement="center" className="px-4">
            <Modal.Dialog className="w-full max-w-190">
              <form onSubmit={handleSubmit(handleCreateAuction)}>
                <Modal.CloseTrigger />

                <Modal.Header>
                  <div>
                    <Modal.Heading>Create Auction</Modal.Heading>
                    <p className="text-sm leading-5 text-muted">
                      Fill quantity and member names for each auction item.
                    </p>
                  </div>
                </Modal.Header>

                <Modal.Body>
                  <div className="mb-5">
                    <div className="flex items-center px-20">
                      <div className="flex items-center gap-2">
                        <div
                          className={[
                            "flex size-8 items-center justify-center rounded-full border text-sm font-semibold",
                            createAuctionStep >= 1
                              ? "border-primary bg-blue-500 text-white"
                              : "border-default text-muted",
                          ].join(" ")}
                        >
                          {createAuctionStep >= 2 ? (
                            <Check width={18} height={18} />
                          ) : (
                            1
                          )}
                        </div>

                        <div>
                          <p className="text-sm font-medium">Quantity</p>
                          <p className="text-xs text-muted">
                            จำนวนและ capacity
                          </p>
                        </div>
                      </div>

                      <div
                        className={[
                          "mx-4 h-px flex-1",
                          createAuctionStep >= 2 ? "bg-blue-500" : "bg-default",
                        ].join(" ")}
                      />

                      <div className="flex items-center gap-2">
                        <div
                          className={[
                            "flex size-8 items-center justify-center rounded-full border text-sm font-semibold",
                            createAuctionStep >= 2
                              ? "border-primary bg-blue-500 text-white"
                              : "border-default text-muted",
                          ].join(" ")}
                        >
                          2
                        </div>

                        <div>
                          <p className="text-sm font-medium">Members</p>
                          <p className="text-xs text-muted">รายชื่อคนประมูล</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {createAuctionStep === 1 && (
                    <div className="flex max-h-[60vh] flex-col gap-4 overflow-y-auto pr-1">
                      <div className="hidden grid-cols-[1fr_140px_140px] gap-4 px-1 text-xs font-semibold text-muted sm:grid">
                        <div>Item</div>
                        <div className="text-center">Quantity</div>
                        <div className="text-center">Capacity</div>
                      </div>

                      {auctionItems.map((item) => (
                        <div
                          key={item.key}
                          className="grid grid-cols-1 gap-3 rounded-lg border border-default p-3 sm:grid-cols-[1fr_140px_140px] sm:items-center"
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <Image
                              src={item.image}
                              alt={item.name}
                              width={64}
                              height={64}
                              className="shrink-0 rounded object-contain"
                            />

                            <label className="text-sm font-medium leading-5 text-foreground">
                              {item.name}
                            </label>
                          </div>

                          <Controller
                            control={control}
                            name={`quantities.${item.key}` as const}
                            render={({ field, fieldState }) => (
                              <div>
                                <label
                                  htmlFor={`quantity-${item.key}`}
                                  className="mb-1 block text-xs text-muted sm:hidden"
                                >
                                  Quantity
                                </label>

                                <Input
                                  id={`quantity-${item.key}`}
                                  type="number"
                                  min={0}
                                  value={String(field.value ?? 0)}
                                  onChange={(event) =>
                                    field.onChange(Number(event.target.value))
                                  }
                                  onBlur={field.onBlur}
                                  className="w-full"
                                />

                                {fieldState.error?.message && (
                                  <p className="mt-1 text-xs text-red-500">
                                    {fieldState.error.message}
                                  </p>
                                )}
                              </div>
                            )}
                          />

                          <Controller
                            control={control}
                            name={`capacities.${item.key}` as const}
                            render={({ field, fieldState }) => (
                              <div>
                                <label
                                  htmlFor={`capacity-${item.key}`}
                                  className="mb-1 block text-xs text-muted sm:hidden"
                                >
                                  Capacity
                                </label>

                                <Input
                                  id={`capacity-${item.key}`}
                                  type="number"
                                  min={0}
                                  value={String(field.value ?? 0)}
                                  onChange={(event) =>
                                    field.onChange(Number(event.target.value))
                                  }
                                  onBlur={field.onBlur}
                                  className="w-full"
                                />

                                {fieldState.error?.message && (
                                  <p className="mt-1 text-xs text-red-500">
                                    {fieldState.error.message}
                                  </p>
                                )}
                              </div>
                            )}
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {createAuctionStep === 2 && (
                    <div className="flex max-h-[60vh] flex-col gap-4 overflow-y-auto pr-1">
                      {auctionItems.map((item) => {
                        const winnerText = watchedWinnerTexts?.[item.key] ?? "";
                        const names = splitNamesByRow(winnerText);

                        return (
                          <div
                            key={item.key}
                            className="grid grid-cols-1 gap-3 rounded-lg border border-default p-3 sm:grid-cols-[260px_1fr] sm:items-start"
                          >
                            <div className="flex min-w-0 items-center gap-3">
                              <Image
                                src={item.image}
                                alt={item.name}
                                width={64}
                                height={64}
                                className="shrink-0 rounded object-contain"
                              />

                              <div className="min-w-0">
                                <p className="text-sm font-medium leading-5 text-foreground">
                                  {item.name}
                                </p>

                                <p className="mt-1 text-xs text-muted">
                                  {names.length} member
                                  {names.length > 1 ? "s" : ""}
                                </p>
                              </div>
                            </div>

                            <Controller
                              control={control}
                              name={`winnerTexts.${item.key}` as const}
                              render={({ field }) => (
                                <div className="flex flex-col gap-2">
                                  <TextArea
                                    fullWidth
                                    rows={4}
                                    variant="secondary"
                                    value={field.value ?? ""}
                                    placeholder={`ตัวอย่าง:\nA\nB`}
                                    onChange={field.onChange}
                                    onBlur={field.onBlur}
                                    className="w-full"
                                    style={{ resize: "vertical" }}
                                  />

                                  {names.length > 0 && (
                                    <div className="rounded-md bg-default/40 px-3 py-2 text-xs text-muted">
                                      Preview: {names.join(", ")}
                                    </div>
                                  )}
                                </div>
                              )}
                            />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </Modal.Body>

                <Modal.Footer>
                  <div className="flex w-full justify-end gap-2">
                    {createAuctionStep === 1 && (
                      <>
                        <Button type="button" variant="outline" slot="close">
                          Cancel
                        </Button>

                        <Button
                          type="button"
                          variant="primary"
                          onPress={handleNextStep}
                        >
                          Next
                        </Button>
                      </>
                    )}

                    {createAuctionStep === 2 && (
                      <>
                        <Button
                          type="button"
                          variant="outline"
                          onPress={handleBackStep}
                        >
                          Back
                        </Button>

                        <Button type="submit" variant="primary">
                          Submit
                        </Button>
                      </>
                    )}
                  </div>
                </Modal.Footer>
              </form>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </>
  );
}
