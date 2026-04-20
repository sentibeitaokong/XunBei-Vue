import {reactive} from "../../reactivity/src/reactive";
import {nextTick} from "../src";
import {describe, expect, it,vi} from "vitest";
import {watchEffect} from '../src/apiWatch'

describe("api: watch", () => {
    //测试effect功能
    it("effect", async () => {
        const state = reactive({count: 0});
        let dummy;
        watchEffect(() => {
            dummy = state.count;
        });
        expect(dummy).toBe(0);

        state.count++;
        await nextTick();
        expect(dummy).toBe(1);
    });
    //测试watchEffect的清空依赖功能
    it("stopping the watcher (effect)", async () => {
        const state = reactive({count: 0});
        let dummy;
        const stop: any = watchEffect(() => {
            dummy = state.count;
        });
        expect(dummy).toBe(0);

        stop();
        state.count++;
        await nextTick();
        // should not update
        expect(dummy).toBe(0);
    });

    it("cleanup registration (effect)", async () => {
        const state = reactive({count: 0});
        const cleanup = vi.fn();
        let dummy;
        const stop: any = watchEffect((onCleanup:any) => {
            onCleanup(cleanup);
            dummy = state.count;
        });
        expect(dummy).toBe(0);

        state.count++;
        await nextTick();
        expect(cleanup).toHaveBeenCalledTimes(1);
        expect(dummy).toBe(1);

        stop();
        expect(cleanup).toHaveBeenCalledTimes(2);
    });
});
