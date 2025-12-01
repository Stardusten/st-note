import { type Component, type JSX, splitProps } from "solid-js"


export const CircleX: Component<JSX.SvgSVGAttributes<SVGSVGElement>> = (props) => {
    const [local, others] = splitProps(props, ["class"])

    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            class={local.class}
            {...others}
        >
            <circle cx="12" cy="12" r="10" />
            <path
                d="M15 9L9 15M9 9L15 15"
                stroke="white"
                stroke-width="2"
                stroke-linecap="round"
                fill="none"
            />
        </svg>
    )
}

export default CircleX
